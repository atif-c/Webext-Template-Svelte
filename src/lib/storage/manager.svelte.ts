import {
    defaultStorageObject,
    type StorageObject,
} from '@src/lib/storage/default-object';
import { cleanObject, getStorageArea } from '@src/lib/storage/utils';
import { debounce } from '@src/lib/utils/debounce';

let storageLoaded = false;
let autoSaveEffectRegistered = false;

// Reactive persistent storage variable initialised with default values
export const storage = $state<StorageObject>({ ...defaultStorageObject });

// Immediately load from storage on module import
(async () => {
    try {
        await loadState();
        storageLoaded = true;

        // Clean Up storage area
        getStorageArea().clear();
        getStorageArea().set(cleanObject(storage, defaultStorageObject));
    } catch (error) {
        console.error('Failed to load from storage:', error);
    }
})();

/**
 * Call this once in your root component or layout to enable
 * automatic saving of storage on change, without manual calls
 */
export function initialiseStorageAutoSave() {
    if (autoSaveEffectRegistered) return;
    autoSaveEffectRegistered = true;

    $effect(() => {
        // Track deep changes
        JSON.stringify(storage);

        if (!storageLoaded) return;

        saveState();
    });
}

// Load from storage
async function loadState() {
    const raw = await getStorageArea().get();
    Object.assign(storage, raw);
}

// Debounced save to reduce frequent storage writes
const saveState = debounce(
    async () => {
        try {
            await getStorageArea().set(
                cleanObject($state.snapshot(storage), defaultStorageObject)
            );
            console.log('Storage saved');
        } catch (err) {
            console.error('Failed to save to storage:', err);
        }
    },
    { delay: 500, maxWait: 1000 }
);
