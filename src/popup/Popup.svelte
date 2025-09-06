<script lang="ts">
    import Counter from '@src/lib/components/Counter.svelte';
    import { initialiseStorageAutoSave } from '@src/lib/storage/state.svelte';

    initialiseStorageAutoSave();
</script>

<h1>My Web Extension</h1>

<div class="counter">
    <Counter />
</div>
