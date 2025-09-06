import { defaultStorageObject } from '@src/lib/storage/default-object';
import { StateManager } from '@src/lib/storage/state-manager.svelte';
import { cleanObject, getStorageArea } from '@src/lib/storage/utils';

let storageLoaded = false;
let autoSaveEffectRegistered = false;

// Reactive persistent storage variable initialised with default values
const stateManager = new StateManager<typeof defaultStorageObject>(
    loadState,
    saveState,
    { delay: 500, maxWait: 1000 }
);

export const state = stateManager.state;

// Immediately load from storage on module import
(async () => {
    try {
        await stateManager.load();
        storageLoaded = true;

        // Clean Up storage area
        getStorageArea().set(
            cleanObject(stateManager.state!, defaultStorageObject)
        );
    } catch (error) {
        console.error('Failed to load from storage:', error);
    }
})();

/**
 * Call this once in your root component or layout to enable
 * automatic saving of storage on change, without manual calls
 */
export const initialiseStorageAutoSave = () => {
    if (autoSaveEffectRegistered) return;
    autoSaveEffectRegistered = true;

    $effect(() => {
        // Track deep changes
        JSON.stringify(stateManager.state);

        if (!storageLoaded) return;

        stateManager.save();
    });
};

async function loadState(): Promise<typeof defaultStorageObject> {
    try {
        const raw = (await getStorageArea().get()) as Partial<
            typeof defaultStorageObject
        >;

        return cleanObject(raw, defaultStorageObject);
    } catch (err) {
        console.error('Failed to load from storage:', err);
        throw err;
    }
}

// Save function just triggers the debounced save
async function saveState() {
    try {
        await getStorageArea().set($state.snapshot(stateManager.state));
        console.log('Storage saved');
    } catch (err) {
        console.error('Failed to save to storage:', err);
    }
}
