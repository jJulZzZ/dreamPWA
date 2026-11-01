<script lang="ts">
  import { onMount } from 'svelte';
  import { db, initialiseDatabase } from './lib/db';
  import { cleanText, extract, transcribe } from './lib/ai';
  import { makeStats } from './lib/stats';
  import { cleanAnalysis, detailLabels, formatDate, id, now, today, uniqueLabels } from './lib/utils';
  import { dreamColor, dreamTitle, needsProcessing } from './lib/presentation';
  import { resetPinAndDeletePrivateDreams, savePin, verifyPin } from './lib/privacy';
  import type { BackupFile, Category, Dream, DreamAnalysis, DreamStatus, Settings } from './lib/types';

  type Tab = 'accueil' | 'calendrier' | 'recherche' | 'stats' | 'reglages';
  const emptyAnalysis = (): DreamAnalysis => ({ characters: [], places: [], themes: [], keywords: [], feelings: [], detailLevel: 3, schemaVersion: 1 });
  let tab: Tab = 'accueil';
  let dreams: Dream[] = [];
  let categories: Category[] = [];
  let settings: Settings = { id: 'main', profile: '' };
  let selected: Dream | null = null;
  let composer = false;
  let importingLegacy = false;
  let draftText = '';
  let draftDate = today();
  let draftCategory = 'normal';
  let draftPrivate = false;
  let voiceBlob: Blob | null = null;
  let captureMode: 'texte' | 'vocal' = 'texte';
  let microphonePending = false;
  let recorder: MediaRecorder | null = null;
  let recording = false;
  let loading = false;
  let notice = '';
  let unlocked = false;
  let pinDialog = false;
  let pinValue = '';
  let pinPurpose: 'unlock' | 'create' | 'change' = 'unlock';
  let newPinValue = '';
  let confirmPinValue = '';
  let pinBusy = false;
  let pinAction: (() => void | Promise<void>) | null = null;
  let daySelected = today();
  let searchTerm = '';
  let searchCategory = '';
  let month = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  let statsFrom = new Date(new Date().getFullYear(), 0, 1).toLocaleDateString('en-CA');
  let statsTo = today();
  let showRaw = false;
  let editorLists = { characters: '', places: '', themes: '', keywords: '', feelings: '' };

  $: visibleDreams = dreams.filter((dream) => !dream.deletedAt);
  $: accessibleDreams = visibleDreams.filter((dream) => !dream.isPrivate || unlocked);
  $: pendingDreams = visibleDreams.filter(needsProcessing);
  $: dayDreams = visibleDreams.filter((dream) => dream.date === daySelected).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  $: filteredDreams = accessibleDreams.filter(matchesSearch).sort((a, b) => b.date.localeCompare(a.date));
  $: stats = makeStats(accessibleDreams.filter((dream) => dream.date >= statsFrom && dream.date <= statsTo), categories);

  onMount(async () => { await initialiseDatabase(); await refresh(); });

  async function refresh() {
    dreams = await db.dreams.toArray();
    categories = await db.categories.toArray();
    settings = (await db.settings.get('main')) ?? { id: 'main', profile: '' };
  }
  function message(text: string) { notice = text; setTimeout(() => { if (notice === text) notice = ''; }, 4200); }
  function openComposer(legacy = false) {
    importingLegacy = legacy; draftText = ''; draftDate = today(); draftCategory = 'normal'; draftPrivate = false; voiceBlob = null; captureMode = 'texte'; composer = true;
  }
  function getCategory(categoryId: string) { return categories.find((category) => category.id === categoryId) ?? categories[0]; }
  function setEditorLists(analysis?: DreamAnalysis) {
    const a = analysis ?? emptyAnalysis();
    editorLists = { characters: a.characters.join(', '), places: a.places.join(', '), themes: a.themes.join(', '), keywords: a.keywords.join(', '), feelings: a.feelings.join(', ') };
  }
  function openDream(dream: Dream) {
    if (dream.isPrivate && !unlocked) { openPin(settings.pinHash ? 'unlock' : 'create', () => openDream(dream)); return; }
    selected = structuredClone(dream); setEditorLists(selected.analysis); showRaw = false;
  }
  function openPin(purpose: typeof pinPurpose, action: (() => void | Promise<void>) | null = null) {
    pinPurpose = purpose; pinValue = ''; newPinValue = ''; confirmPinValue = ''; pinAction = action; pinDialog = true;
  }
  function makePrivate(target: 'draft' | 'selected', value: boolean) {
    const apply = () => { if (target === 'draft') draftPrivate = value; else if (selected) selected.isPrivate = value; };
    if (value && (!settings.pinHash || !unlocked)) openPin(settings.pinHash ? 'unlock' : 'create', apply);
    else apply();
  }
  async function saveDraft() {
    if (recording || microphonePending) return;
    const isVoice = captureMode === 'vocal';
    if (isVoice ? !voiceBlob : !draftText.trim()) return message('Écrivez votre rêve ou enregistrez votre voix.');
    if (draftPrivate && (!settings.pinHash || !unlocked)) { openPin(settings.pinHash ? 'unlock' : 'create', saveDraft); return; }
    const dream: Dream = {
      id: id(), date: draftDate, createdAt: now(), updatedAt: now(), captureMode: isVoice ? 'vocal' : 'texte',
      cleanedText: isVoice ? '' : draftText.trim(), categoryId: draftCategory, isPrivate: draftPrivate,
      status: isVoice ? 'a_transcrire' : 'a_analyser'
    };
    await db.dreams.add(dream);
    if (isVoice && voiceBlob) await db.audio.put({ dreamId: dream.id, blob: voiceBlob, mimeType: voiceBlob.type, createdAt: now() });
    composer = false; await refresh(); openDream(dream); message(importingLegacy ? 'Rêve importé et prêt à être analysé.' : 'Rêve enregistré localement.');
  }
  async function startRecording() {
    if (microphonePending || recording) return;
    microphonePending = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferred = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'].find((type) => MediaRecorder.isTypeSupported(type));
      const chunks: BlobPart[] = [];
      recorder = new MediaRecorder(stream, preferred ? { mimeType: preferred } : undefined);
      recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      const currentRecorder = recorder;
      recorder.onstop = () => { voiceBlob = new Blob(chunks, { type: currentRecorder.mimeType || 'audio/webm' }); stream.getTracks().forEach((track) => track.stop()); recording = false; };
      recorder.start(); recording = true;
    } catch { message('Le microphone est nécessaire pour enregistrer un rêve vocal.'); }
    finally { microphonePending = false; }
  }
  function stopRecording() { recorder?.stop(); }
  async function processDream(dreamId: string) {
    let dream = await db.dreams.get(dreamId); if (!dream) return;
    if (!navigator.onLine) { message('Hors connexion : le rêve reste dans votre file d’analyse.'); return; }
    loading = true;
    try {
      if (dream.status === 'erreur') {
        dream.status = dream.retryStatus ?? (dream.captureMode === 'vocal' && !dream.rawText ? 'a_transcrire' : dream.rawText && dream.cleanedText === dream.rawText ? 'a_nettoyer' : 'a_analyser');
        await db.dreams.put(dream);
      }
      if (dream.status === 'a_transcrire') {
        const audio = await db.audio.get(dream.id); if (!audio) throw new Error('L’enregistrement temporaire est introuvable.');
        dream.rawText = await transcribe(audio.blob); dream.cleanedText = dream.rawText; dream.status = 'a_nettoyer';
        await db.dreams.put({ ...dream, updatedAt: now() });
      }
      dream = (await db.dreams.get(dream.id))!;
      if (dream.status === 'a_nettoyer') {
        dream.cleanedText = await cleanText(dream.rawText || dream.cleanedText); dream.status = 'a_analyser';
        await db.dreams.put({ ...dream, updatedAt: now() });
      }
      dream = (await db.dreams.get(dream.id))!;
      if (dream.status === 'a_analyser' || dream.analysisStale || dream.status === 'erreur') {
        dream.analysis = cleanAnalysis(await extract(dream.cleanedText, settings.profile));
        dream.status = 'a_valider'; dream.analysisStale = false; dream.error = undefined; dream.retryStatus = undefined;
        await db.dreams.put({ ...dream, updatedAt: now() });
      }
      const updated = await db.dreams.get(dream.id); if (updated) { selected = structuredClone(updated); setEditorLists(updated.analysis); }
      await refresh(); message('Analyse prête : vérifiez-la avant de valider.');
    } catch (error) {
      const messageError = error instanceof Error ? error.message : 'Analyse impossible.';
      await db.dreams.update(dream.id, { retryStatus: dream.status === 'erreur' ? dream.retryStatus : dream.status, status: 'erreur', error: messageError, updatedAt: now() });
      await refresh(); const failed = await db.dreams.get(dream.id); if (failed) selected = structuredClone(failed); message(messageError);
    } finally { loading = false; }
  }
  function analysisFromEditor(): DreamAnalysis {
    const split = (value: string, max?: number) => uniqueLabels(value.split(','), max);
    return cleanAnalysis({ title: selected?.analysis?.title?.trim(), characters: split(editorLists.characters), places: split(editorLists.places), themes: split(editorLists.themes), keywords: split(editorLists.keywords, 5), feelings: split(editorLists.feelings), detailLevel: selected?.analysis?.detailLevel ?? 3, schemaVersion: 1 });
  }
  async function saveSelected(validate = false) {
    if (!selected) return;
    const changedText = selected.cleanedText !== (await db.dreams.get(selected.id))?.cleanedText;
    const analysis = selected.analysis ? analysisFromEditor() : undefined;
    const update: Dream = { ...selected, analysis, status: validate ? 'analyse' : selected.status, analysisStale: changedText ? true : selected.analysisStale, updatedAt: now() };
    await db.dreams.put(update);
    if (validate) await db.audio.delete(selected.id);
    selected = structuredClone(update); await refresh(); message(validate ? 'Rêve validé. L’audio temporaire a été supprimé.' : 'Modifications enregistrées.');
  }
  async function trashSelected() {
    if (!selected || !confirm('Placer ce rêve dans la corbeille pendant 30 jours ?')) return;
    await db.dreams.update(selected.id, { deletedAt: now(), updatedAt: now() }); selected = null; await refresh(); message('Rêve déplacé dans la corbeille.');
  }
  function matchesSearch(dream: Dream) {
    if (searchCategory && dream.categoryId !== searchCategory) return false;
    const query = searchTerm.trim().toLocaleLowerCase('fr-FR'); if (!query) return true;
    return [...(dream.analysis?.characters ?? []), ...(dream.analysis?.keywords ?? [])].some((value) => value.toLocaleLowerCase('fr-FR').includes(query));
  }
  async function submitPin() {
    if (pinBusy) return;
    pinBusy = true;
    try {
      if (pinPurpose === 'unlock') {
        if (!await verifyPin(pinValue)) throw new Error('PIN incorrect.');
      } else {
        if (newPinValue !== confirmPinValue) throw new Error('Les deux nouveaux PIN ne correspondent pas.');
        await savePin(newPinValue, pinPurpose === 'change' ? pinValue : undefined);
        settings = (await db.settings.get('main'))!;
      }
      unlocked = true; pinDialog = false;
      const action = pinAction; pinAction = null;
      message(pinPurpose === 'unlock' ? 'Rêves privés déverrouillés.' : 'PIN enregistré.');
      await action?.();
    } catch (error) { message(error instanceof Error ? error.message : 'Impossible de modifier le PIN.'); }
    finally { pinBusy = false; }
  }
  function lockPrivateDreams() {
    unlocked = false; if (selected?.isPrivate) selected = null; draftPrivate = false;
    message('Rêves privés verrouillés.');
  }
  async function resetPin() {
    if (loading) return;
    const count = dreams.filter((dream) => dream.isPrivate).length;
    if (!confirm(`Réinitialiser le PIN supprimera définitivement ${count} rêve(s) privé(s), y compris dans la corbeille, et leurs audios. Cette suppression est irréversible. Continuer ?`)) return;
    try {
      const deleted = await resetPinAndDeletePrivateDreams();
      unlocked = false; selected = null; draftPrivate = false; pinAction = null; pinDialog = false;
      await refresh(); message(`PIN réinitialisé. ${deleted} rêve(s) privé(s) supprimé(s) définitivement.`);
    } catch { message('La réinitialisation a échoué. Réessayez.'); }
  }
  async function saveProfile() { await db.settings.put(settings); message('Profil personnel enregistré.'); }
  async function exportBackup() {
    const backup: BackupFile = { format: 'reveil-backup', version: 1, exportedAt: now(), dreams: visibleDreams.filter((dream) => !dream.isPrivate || unlocked), categories, settings: { profile: settings.profile, pinSalt: settings.pinSalt, pinHash: settings.pinHash } };
    const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = `reveil-sauvegarde-${today()}.json`; link.click(); URL.revokeObjectURL(url);
  }
  async function importBackup(event: Event) {
    const input = event.currentTarget as HTMLInputElement; const file = input.files?.[0]; if (!file) return;
    try {
      const backup = JSON.parse(await file.text()) as BackupFile;
      if (backup.format !== 'reveil-backup' || backup.version !== 1) throw new Error('Ce fichier n’est pas une sauvegarde Rêveil compatible.');
      const replace = confirm(`Sauvegarde : ${backup.dreams.length} rêves. OK = remplacer les données locales ; Annuler = fusionner.`);
      if (replace && !confirm('Confirmer le remplacement : vos rêves locaux actuels seront supprimés.')) return;
      if (replace) await db.transaction('rw', db.dreams, db.categories, db.settings, async () => { await db.dreams.clear(); await db.categories.clear(); await db.categories.bulkPut(backup.categories); await db.dreams.bulkPut(backup.dreams); await db.settings.put({ id: 'main', ...backup.settings }); });
      else { await db.categories.bulkPut(backup.categories); for (const dream of backup.dreams) if (!await db.dreams.get(dream.id)) await db.dreams.put(dream); }
      await refresh(); message('Sauvegarde importée.');
    } catch (error) { message(error instanceof Error ? error.message : 'Import impossible.'); }
    input.value = '';
  }
  async function addCategory() {
    const name = prompt('Nom de la catégorie ?')?.trim(); if (!name) return;
    const color = prompt('Couleur hexadécimale ?', '#a78bfa')?.trim() || '#a78bfa';
    await db.categories.add({ id: id(), name, color }); await refresh();
  }
  async function restore(dream: Dream) { await db.dreams.update(dream.id, { deletedAt: undefined, updatedAt: now() }); await refresh(); }
  function daysInCalendar() {
    const first = new Date(month.getFullYear(), month.getMonth(), 1); const offset = (first.getDay() + 6) % 7;
    const total = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return Array.from({ length: offset + total }, (_, i) => i < offset ? null : new Date(month.getFullYear(), month.getMonth(), i - offset + 1));
  }
  function dateKey(day: Date) { return day.toLocaleDateString('en-CA'); }
  function moveMonth(delta: number) { month = new Date(month.getFullYear(), month.getMonth() + delta, 1); daySelected = dateKey(month); }
</script>

<svelte:head><meta name="description" content="Journal de rêves français, privé et disponible hors ligne." /></svelte:head>

<main>
  <header class="topbar"><div><p class="eyebrow">JOURNAL ONIRIQUE</p><h1>Rêveil</h1></div><button class="icon-button" aria-label="Réglages" on:click={() => tab = 'reglages'}>☼</button></header>
  {#if notice}<div class="toast">{notice}</div>{/if}

  {#if tab === 'accueil'}
    <section class="hero"><p class="eyebrow">{new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}</p><h2>Qu’avez-vous rêvé<br />cette nuit&nbsp;?</h2><p>Gardez la trace de l’étrange avant qu’il ne s’efface.</p><button class="primary capture" on:click={() => openComposer()}>✦ Raconter un rêve</button></section>
    <section class="section"><div class="section-heading"><h3>À traiter</h3><span>{pendingDreams.length}</span></div>
      {#if pendingDreams.length === 0}<div class="empty">Votre journal est à jour.</div>{/if}
      {#each pendingDreams.slice(0, 4) as dream}<button class="dream-card pending" on:click={() => openDream(dream)}><span class="dot" style={`background:${dreamColor(dream, categories)}`}></span><span><strong>{dreamTitle(dream, unlocked)}</strong><small>{formatDate(dream.date)} · À traiter</small></span><b>›</b></button>{/each}
    </section>
    <section class="section"><div class="section-heading"><h3>Derniers rêves</h3><button class="text-button" on:click={() => tab = 'calendrier'}>Voir tout</button></div>
      {#each accessibleDreams.sort((a,b) => b.date.localeCompare(a.date)).slice(0, 3) as dream}<button class="dream-card" class:pending={needsProcessing(dream)} on:click={() => openDream(dream)}><span class="dot" style={`background:${dreamColor(dream, categories)}`}></span><span><strong>{dreamTitle(dream, unlocked)}</strong><small>{formatDate(dream.date)} · {needsProcessing(dream) ? 'À traiter' : getCategory(dream.categoryId)?.name}</small></span><b>›</b></button>{/each}
    </section>
  {:else if tab === 'calendrier'}
    <section class="page-title"><p class="eyebrow">VOS NUITS</p><h2>Calendrier</h2></section>
    <div class="month-nav"><button aria-label="Mois précédent" on:click={() => moveMonth(-1)}>‹</button><strong>{new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(month)}</strong><button aria-label="Mois suivant" on:click={() => moveMonth(1)}>›</button></div>
    <div class="weekdays">{#each ['L','M','M','J','V','S','D'] as label}<span>{label}</span>{/each}</div>
    <div class="calendar">{#each daysInCalendar() as day}{#if day}<button class="day" class:selected-day={daySelected === dateKey(day)} aria-pressed={daySelected === dateKey(day)} aria-label={`Voir les rêves du ${formatDate(dateKey(day))}`} on:click={() => daySelected = dateKey(day)}><span>{day.getDate()}</span>{#each visibleDreams.filter((dream) => dream.date === dateKey(day)) as dream}<span class="calendar-dream" style={`background:${dreamColor(dream, categories)}`} title={needsProcessing(dream) ? 'À traiter' : getCategory(dream.categoryId)?.name}>{dream.isPrivate && !unlocked ? '⌁' : '✦'}</span>{/each}</button>{:else}<div class="day blank"></div>{/if}{/each}</div>
    <p class="muted">Rouge : à traiter · Une case par rêve</p>
    <section class="section"><div class="section-heading"><h3>{formatDate(daySelected)}</h3><span>{dayDreams.length} rêve(s)</span></div>
      {#each dayDreams as dream}<button class="dream-card" class:pending={needsProcessing(dream)} on:click={() => openDream(dream)}><span class="dot" style={`background:${dreamColor(dream, categories)}`}></span><span><strong>{dreamTitle(dream, unlocked)}</strong><small>{needsProcessing(dream) ? 'À traiter' : getCategory(dream.categoryId)?.name}{dream.isPrivate ? ' · Privé' : ''}</small></span><b>›</b></button>{:else}<p class="empty">Aucun rêve enregistré ce jour-là.</p>{/each}
    </section>
  {:else if tab === 'recherche'}
    <section class="page-title"><p class="eyebrow">RETROUVER</p><h2>Recherche</h2></section>
    <input class="search" bind:value={searchTerm} placeholder="Personnage ou mot-clé…" />
    <select bind:value={searchCategory}><option value="">Toutes les catégories</option>{#each categories as category}<option value={category.id}>{category.name}</option>{/each}</select>
    <section class="section">{#if !unlocked && visibleDreams.some((dream) => dream.isPrivate)}<p class="muted">Les rêves privés verrouillés n’apparaissent pas dans les résultats.</p>{/if}{#each filteredDreams as dream}<button class="dream-card" class:pending={needsProcessing(dream)} on:click={() => openDream(dream)}><span class="dot" style={`background:${dreamColor(dream, categories)}`}></span><span><strong>{dreamTitle(dream, unlocked)}</strong><small>{formatDate(dream.date)} · {(dream.analysis?.keywords ?? []).join(', ')}</small></span><b>›</b></button>{:else}<div class="empty">Aucun rêve ne correspond.</div>{/each}</section>
  {:else if tab === 'stats'}
    <section class="page-title"><p class="eyebrow">MOTIFS RÉCURRENTS</p><h2>Statistiques</h2></section>
    <div class="date-range"><label>Du<input type="date" bind:value={statsFrom} /></label><label>Au<input type="date" bind:value={statsTo} /></label></div>
    {#if !unlocked && visibleDreams.some((dream) => dream.isPrivate)}<p class="privacy-note">⌁ Les rêves privés verrouillés sont exclus des statistiques.</p>{/if}
    <div class="metrics"><div><strong>{stats.dreamCount}</strong><span>rêves analysés</span></div><div><strong>{stats.averageDetail ? stats.averageDetail.toFixed(1) : '—'}</strong><span>détail moyen / 5</span></div><div><strong>{stats.averageWords ? Math.round(stats.averageWords) : '—'}</strong><span>mots en moyenne</span></div></div>
    {#each [{label:'Personnages',data:stats.characters},{label:'Lieux',data:stats.places},{label:'Thèmes',data:stats.themes},{label:'Émotions',data:stats.feelings},{label:'Associations',data:stats.pairs},{label:'Catégories',data:stats.byCategory}] as block}<section class="stat-block"><h3>{block.label}</h3>{#if block.data.length}{#each block.data.slice(0, 5) as item}<div class="stat-row"><span>{item.label}</span><b>{item.count}</b></div>{/each}{:else}<p class="muted">Pas encore de données.</p>{/if}</section>{/each}
  {:else if tab === 'reglages'}
    <section class="page-title"><p class="eyebrow">À VOTRE IMAGE</p><h2>Réglages</h2></section>
    <section class="setting-card"><h3>Profil personnel</h3><p>Ajoutez les personnes, surnoms et contextes que l’IA doit connaître.</p><textarea bind:value={settings.profile} placeholder="Ex. « Les gars » désigne Lucien, Paul et Jean."></textarea><button class="secondary" on:click={saveProfile}>Enregistrer le profil</button></section>
    <section class="setting-card"><h3>Confidentialité</h3><p>Le PIN masque les rêves dans l’interface. Il ne chiffre pas IndexedDB.</p>{#if settings.pinHash}<button class="secondary" on:click={() => unlocked ? lockPrivateDreams() : openPin('unlock')}>{unlocked ? 'Verrouiller les rêves privés' : 'Déverrouiller les rêves privés'}</button><button class="secondary" on:click={() => openPin('change')}>Modifier le PIN</button><button class="danger" disabled={loading} on:click={resetPin}>PIN oublié ? Réinitialiser</button><p>La réinitialisation supprime définitivement tous les rêves privés, même dans la corbeille.</p>{:else}<p>Votre PIN sera créé lors du premier rêve marqué comme privé.</p>{/if}</section>
    <section class="setting-card"><h3>Catégories</h3>{#each categories as category}<div class="category-line"><span class="dot" style={`background:${category.color}`}></span>{category.name}</div>{/each}<button class="secondary" on:click={addCategory}>+ Nouvelle catégorie</button></section>
    <section class="setting-card"><h3>Import et sauvegarde</h3><button class="secondary" on:click={() => openComposer(true)}>Importer un rêve ancien</button><button class="secondary" on:click={exportBackup}>Exporter mes rêves (sans audio)</button><label class="secondary file-input">Importer une sauvegarde JSON<input type="file" accept="application/json" on:change={importBackup} /></label></section>
    <section class="setting-card"><h3>Corbeille</h3>{#each dreams.filter((dream) => dream.deletedAt) as dream}<div class="trash-line"><span>{formatDate(dream.date)}</span><button class="text-button" on:click={() => restore(dream)}>Restaurer</button></div>{:else}<p class="muted">La corbeille est vide.</p>{/each}</section>
  {/if}
</main>

<nav><button class:active={tab === 'accueil'} on:click={() => tab = 'accueil'}>⌂<span>Accueil</span></button><button class:active={tab === 'calendrier'} on:click={() => tab = 'calendrier'}>▦<span>Calendrier</span></button><button class:active={tab === 'recherche'} on:click={() => tab = 'recherche'}>⌕<span>Recherche</span></button><button class:active={tab === 'stats'} on:click={() => tab = 'stats'}>◔<span>Stats</span></button></nav>

{#if composer}<div class="overlay"><section class="modal composer"><button class="close" disabled={microphonePending} on:click={() => { if (recording) stopRecording(); composer = false; }}>×</button><p class="eyebrow">{importingLegacy ? 'SOUVENIR ANCIEN' : 'NOUVEAU RÊVE'}</p><h2>{importingLegacy ? 'Importer un rêve' : 'Racontez-le vite'}</h2><div class="mode"><button class:chosen={captureMode === 'texte'} aria-pressed={captureMode === 'texte'} disabled={recording || microphonePending} on:click={() => captureMode = 'texte'}>Écrire</button><button class:chosen={captureMode === 'vocal'} aria-pressed={captureMode === 'vocal'} disabled={recording || microphonePending} on:click={() => captureMode = 'vocal'}>Parler</button></div>
  {#if captureMode === 'texte'}<textarea bind:value={draftText} placeholder="Tout ce dont vous vous souvenez…"></textarea>{:else}<div class="recording-box"><span class:recording>●</span><strong>{recording ? 'Enregistrement en cours…' : voiceBlob ? 'Enregistrement prêt' : 'Votre rêve, avec vos mots'}</strong><p>{recording ? 'Dites tout, même ce qui paraît étrange.' : voiceBlob ? 'Votre voix sera transcrite lorsque vous lancerez l’analyse.' : 'Appuyez sur le bouton et racontez ce dont vous vous souvenez.'}</p></div>
  <button class:record={recording} class="voice-button" disabled={microphonePending} on:click={() => recording ? stopRecording() : startRecording()}>{microphonePending ? 'Accès au microphone…' : recording ? '■ Arrêter' : voiceBlob ? '↻ Réenregistrer' : '◉ Commencer l’enregistrement'}</button>{/if}
  <div class="form-grid"><label>Date<input type="date" bind:value={draftDate} /></label><label>Catégorie<select bind:value={draftCategory}>{#each categories as category}<option value={category.id}>{category.name}</option>{/each}</select></label></div><label class="private-toggle"><input type="checkbox" checked={draftPrivate} on:change={(event) => { const value = event.currentTarget.checked; event.currentTarget.checked = draftPrivate; makePrivate('draft', value); }} /> Rêve privé</label><button class="primary" disabled={recording || microphonePending || (captureMode === 'vocal' ? !voiceBlob : !draftText.trim())} on:click={saveDraft}>Enregistrer localement</button></section></div>{/if}

{#if selected}<div class="overlay editor-overlay"><section class="modal editor"><button class="close" on:click={() => selected = null}>×</button><p class="eyebrow">{selected.status === 'analyse' ? 'RÊVE VALIDÉ' : selected.status.replaceAll('_', ' ').toUpperCase()}</p><h2>{selected.analysis?.title || formatDate(selected.date)}</h2><div class="form-grid"><label>Date<input type="date" bind:value={selected.date} /></label><label>Catégorie<select bind:value={selected.categoryId}>{#each categories as category}<option value={category.id}>{category.name}</option>{/each}</select></label></div><label class="private-toggle"><input type="checkbox" checked={selected.isPrivate} on:change={(event) => { const value = event.currentTarget.checked; event.currentTarget.checked = selected!.isPrivate; makePrivate('selected', value); }} /> Rêve privé</label>
  {#if selected.captureMode === 'vocal' && selected.rawText}<button class="raw-toggle" on:click={() => showRaw = !showRaw}>{showRaw ? 'Masquer' : 'Voir'} la transcription brute</button>{#if showRaw}<blockquote>{selected.rawText}</blockquote>{/if}{/if}
  <textarea class="dream-text" bind:value={selected.cleanedText} placeholder="Votre rêve…"></textarea>
  {#if selected.error}<p class="error">{selected.error}</p>{/if}
  {#if selected.status !== 'analyse' || selected.analysisStale}<button class="primary" disabled={loading} on:click={() => processDream(selected!.id)}>{loading ? 'Analyse en cours…' : selected.analysisStale ? 'Ré-analyser le texte' : 'Lancer l’analyse'}</button>{/if}
  {#if selected.analysis}<section class="analysis"><div class="analysis-head"><h3>Analyse à valider</h3><span class="grade">{selected.analysis.detailLevel}/5</span></div><label>Titre du rêve<input bind:value={selected.analysis.title} maxlength="100" placeholder="Un titre court" /></label><p class="muted">{detailLabels[selected.analysis.detailLevel - 1]}</p>{#each [['characters','Personnages'],['places','Lieux'],['themes','Thèmes'],['keywords','Mots-clés'],['feelings','Émotions']] as item}<label>{item[1]}<input bind:value={editorLists[item[0] as keyof typeof editorLists]} placeholder="Séparez par des virgules" /></label>{/each}<label>Niveau de détail<select bind:value={selected.analysis.detailLevel}>{#each [1,2,3,4,5] as level}<option value={level}>{level}/5 — {detailLabels[level - 1]}</option>{/each}</select></label></section>{/if}
  <div class="editor-actions"><button class="secondary" on:click={() => saveSelected(false)}>Enregistrer</button>{#if selected.analysis}<button class="primary" on:click={() => saveSelected(true)}>Valider l’analyse</button>{/if}</div><button class="danger" on:click={trashSelected}>Placer dans la corbeille</button></section></div>{/if}

{#if pinDialog}<div class="overlay pin-overlay"><section class="modal pin"><button class="close" disabled={pinBusy} aria-label="Annuler le PIN" on:click={() => { pinDialog = false; pinAction = null; }}>×</button><p class="eyebrow">CONFIDENTIALITÉ</p><h2>{pinPurpose === 'create' ? 'Créer votre PIN' : pinPurpose === 'change' ? 'Modifier votre PIN' : 'Déverrouiller les rêves privés'}</h2><p>{pinPurpose === 'create' ? 'Choisissez un PIN secret à six chiffres pour vos rêves privés.' : pinPurpose === 'change' ? 'Saisissez votre PIN actuel, puis choisissez le nouveau.' : 'Saisissez votre PIN pour consulter vos rêves privés.'}</p>
  {#if pinPurpose !== 'create'}<label>{pinPurpose === 'change' ? 'PIN actuel' : 'PIN'}<input type="password" inputmode="numeric" maxlength="6" pattern="[0-9]*" bind:value={pinValue} placeholder="••••••" aria-label="PIN actuel" /></label>{/if}
  {#if pinPurpose !== 'unlock'}<label>Nouveau PIN<input type="password" inputmode="numeric" maxlength="6" pattern="[0-9]*" bind:value={newPinValue} placeholder="••••••" aria-label="Nouveau PIN" /></label><label>Confirmer le nouveau PIN<input type="password" inputmode="numeric" maxlength="6" pattern="[0-9]*" bind:value={confirmPinValue} placeholder="••••••" aria-label="Confirmer le nouveau PIN" /></label>{/if}
  <button class="primary" disabled={pinBusy} on:click={submitPin}>{pinBusy ? 'Enregistrement…' : pinPurpose === 'create' ? 'Créer le PIN' : pinPurpose === 'change' ? 'Enregistrer le nouveau PIN' : 'Déverrouiller'}</button>{#if settings.pinHash}<button class="danger" disabled={pinBusy || loading} on:click={resetPin}>PIN oublié ? Réinitialiser</button>{/if}
</section></div>{/if}
