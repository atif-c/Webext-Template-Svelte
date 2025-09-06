<script lang="ts">
    import { state } from '@src/lib/storage/state.svelte';

    const incrementCount = () => (state.count += 1);
</script>

<button onclick={incrementCount}>Click Me</button>
<p>
    You have clicked the above button {state.count} time{state.count === 1
        ? ''
        : 's'}
</p>

<input
    type="number"
    bind:value={state.count}
/>

<style>
    button {
        color: white;
        background-color: rgb(0, 100, 150);
        padding: 0.6rem 1.2rem;
        border: none;
        border-radius: 0.25rem;
    }

    button:hover,
    button:focus-visible {
        background-color: rgb(0, 120, 200);
    }

    button:active {
        background-color: rgb(0, 50, 150);
    }

    p {
        margin: 1rem 0;
    }

    input[type='number'] {
        padding: 0.4rem 0.6rem;
    }

    input[type='number']:focus {
        border-color: rgb(0, 120, 200);
        box-shadow: 0 0 3px 1px rgba(0, 120, 200, 0.5);
        outline: none;
    }
</style>
