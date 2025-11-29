/**
 * Svelte 5 generic state management class for managing reactive object state with automatic persistence.
 * Provides asynchronous loading and saving of state via callbacks, with built-in
 * debouncing to optimize save operations and prevent excessive writes.
 *
 * Source: {@link https://github.com/atif-c/Svelte-5-State-Manager atif-c/Svelte-5-State-Manager}
 *
 *  Type constraints:
 * - `T` must be structured-cloneable/serializable. Values that cannot be cloned
 *   (functions, DOM nodes, certain class instances) will throw or lose behavior.
 *
 * Reactivity notes:
 * - `state` is a `$state` object. Mutate its fields (e.g. `manager.state.theme = 'dark'`)
 *   rather than replacing the whole object. Use `$state.snapshot(manager.state)` to read
 *   a non-reactive snapshot.
 *
 * Features:
 * - Reactive state updates using Svelte's $state rune
 * - Automatic debounced saving to prevent excessive writes
 * - Deep cloning to prevent reference mutations
 * - Configurable debounce timing with immediate execution support
 * - Comprehensive error handling with logging
 *
 * @template T - The shape of the managed state object (must be an object with string keys)
 *
 * @example
 * ```typescript
 * interface UserSettings {
 *   theme: 'light' | 'dark';
 *   language: string;
 *   notifications: boolean;
 * }
 *
 * const settingsManager = new StateManager<UserSettings>(
 *   // Load callback - retrieves state from storage
 *   async () => {
 *     const raw = localStorage.getItem('userSettings');
 *     return raw ? JSON.parse(raw) : {
 *       theme: 'dark',
 *       language: 'en',
 *       notifications: true
 *     };
 *   },
 *   // Save callback - persists state to storage
 *   async (data) => {
 *     localStorage.setItem('userSettings', JSON.stringify(data));
 *   },
 *   // Debounce options - wait 500ms, max 2s between saves
 *   { delay: 500, maxWait: 2000 }
 * );
 *
 * // Initialise and use
 * await settingsManager.load();
 * settingsManager.state.theme = 'light'; // Automatically triggers debounced save
 * ```
 */
export class StateManager<T extends Record<string, unknown>> {
    state = $state<T>({} as T);
    #loadCallback: () => T | Promise<T>;
    #saveCallback?: (storage: T) => void | Promise<void>;
    debounceOptions: {
        delay: number;
        maxWait: number;
        immediate?: boolean;
    };

    /** Debounced version of the save function, created during initialisation */
    private debouncedSave = (): void => {};

    /**
     * Creates a new StateManager instance with load/save callbacks and debounce configuration.
     *
     * @param loadCallback - Sync or async function that retrieves the initial state object
     * @param saveCallback - Optional sync or async function to persist state changes
     *   Receives a deep clone of the current state snapshot
     * @param debounceOptions - Configuration for debouncing save operations
     *   Defaults: `{ delay: 0, maxWait: 0, immediate: false }`
     *
     * @throws {Error} Re-throws any errors encountered during debounce function setup
     *
     * @example
     * ```typescript
     * // Simple localStorage-based state manager
     * const manager = new StateManager(
     *   () => JSON.parse(localStorage.getItem('data') || '{}'),
     *   (data) => localStorage.setItem('data', JSON.stringify(data)),
     *   { delay: 1000, maxWait: 5000 }
     * );
     * ```
     */
    constructor(
        loadCallback: () => Promise<T> | T,
        saveCallback?: (state: T) => Promise<void> | void,
        debounceOptions?: typeof this.debounceOptions
    ) {
        this.#loadCallback = loadCallback;
        this.#saveCallback = saveCallback;
        this.debounceOptions = {
            delay: debounceOptions?.delay ?? 0,
            maxWait: debounceOptions?.maxWait ?? 0,
            immediate: debounceOptions?.immediate ?? false,
        };

        // Create debounced save function if saveCallback is provided
        if (this.#saveCallback) {
            this.debouncedSave = this.#debounce(async () => {
                if (!this.#saveCallback) return;

                try {
                    // Create a snapshot and deep clone to prevent mutations during async save
                    const stateSnapshot = structuredClone(
                        $state.snapshot(this.state)
                    ) as T;
                    await this.#saveCallback(stateSnapshot);
                } catch (error) {
                    throw error;
                }
            }, this.debounceOptions);
        }
    }

    /**
     * Loads state data using the configured loadCallback.
     *
     * Uses structured cloning to ensure the loaded data is completely independent
     * from the original source, preventing unintended mutations that could affect
     * the data source or cause unexpected behavior.
     *
     *
     * @returns Promise that resolves when loading is complete and state is populated
     *
     * @throws {Error} Re-throws any error by the loadCallback
     *
     * @example
     * ```typescript
     * const manager = new StateManager(loadFn, saveFn);
     * await manager.load(); // Initialise state from storage
     * console.log(manager.state); // Now contains loaded data
     * ```
     */
    load = async (): Promise<void> => {
        if (!this.#loadCallback) return;

        try {
            const loadedData = await this.#loadCallback();

            // Use structuredClone to create a deep copy, preventing reference sharing
            // between the loaded data and our internal state
            Object.assign(this.state, structuredClone(loadedData));
        } catch (error) {
            throw error;
        }
    };

    /**
     * Triggers a save operation using the configured saveCallback.
     *
     * If debouncing is configured, this will use the debounced.
     * If no saveCallback was provided during construction, this method does nothing.
     *
     * The save operation creates a deep clone of the current state snapshot to
     * prevent mutations during the asynchronous save process.
     *
     * @returns Promise that resolves immediately (debounced saves are fire-and-forget)
     *
     * @throws {Error} If debouncing is disabled (delay = 0), errors from the save
     *                callback are propagated. With debouncing enabled, errors are
     *                thrown asynchronously and may not be catchable by the caller.
     *
     * @example
     * ```typescript
     * manager.state.theme = 'dark'; // Modify state
     * await manager.save(); // Trigger save (may be debounced)
     * ```
     */
    save = async (): Promise<void> => {
        if (this.debouncedSave) {
            this.debouncedSave();
        }
        // Note: With debouncing, this returns immediately while the actual
        // save may happen later. Errors from debounced saves will be logged
        // but not propagated to this caller.
    };

    /**
     * Creates a debounced version of an async function that delays invoking it until
     * after a specified wait time has elapsed since the last call. Optionally supports:
     * - Leading calls (immediate execution on first call in a burst)
     * - Max wait time (guaranteeing execution at least every `maxWait` ms)
     *
     * Useful for reducing frequent async operations such as saving to storage.
     *
     * @template T - Async function type to debounce
     * @param {T} fn - Async function to debounce
     * @param {object} [options] - Configuration options
     * @param {boolean} [options.immediate=false] - If true, trigger on the leading call
     * @param {number} [options.delay=1000] - Delay in milliseconds before invoking after last call
     * @param {number} [options.maxWait] - Maximum time in ms before a call is forced to execute
     * @returns {(...args: Parameters<T>) => void} - Debounced function (fire-and-forget)
     *
     * @example
     * // Save state after user stops typing for 100ms, but at least every 2s
     * const saveState = debounce(async () => {
     *     await browser.storage.local.set({ key: value });
     * }, { delay: 100, maxWait: 2000 });
     *
     * // Leading call + trailing call
     * const onScroll = debounce(async () => { ... }, { delay: 200, immediate: true });
     */
    #debounce = <T extends (...args: any[]) => Promise<any>>(
        fn: T,
        {
            immediate = false,
            delay = 1000,
            maxWait,
        }: { immediate?: boolean; delay?: number; maxWait?: number } = {}
    ): ((...args: Parameters<T>) => void) => {
        let timeout: ReturnType<typeof setTimeout> | null = null;
        let maxTimeout: ReturnType<typeof setTimeout> | null = null;
        let lastInvokeTime = 0;
        let firstCallTime = 0;
        let pendingArgs: Parameters<T> | null = null;

        const invoke = () => {
            if (!pendingArgs) return;
            fn(...pendingArgs);
            lastInvokeTime = Date.now();
            firstCallTime = 0;
            pendingArgs = null;
        };

        const startMaxWaitTimer = () => {
            if (maxTimeout) return; // Already running
            if (maxWait === undefined) return;

            const timeSinceFirstCall = Date.now() - firstCallTime;
            const timeLeft = maxWait - timeSinceFirstCall;

            maxTimeout = setTimeout(() => {
                if (timeout) {
                    clearTimeout(timeout);
                    timeout = null;
                }
                invoke();
                maxTimeout = null;
            }, timeLeft);
        };

        return (...args: Parameters<T>) => {
            pendingArgs = args;

            const now = Date.now();

            if (firstCallTime === 0) {
                firstCallTime = now;
            }

            if (immediate && lastInvokeTime === 0) {
                invoke();
            }

            if (timeout) {
                clearTimeout(timeout);
            }
            timeout = setTimeout(() => {
                if (!immediate) {
                    invoke();
                }
                if (maxTimeout) {
                    clearTimeout(maxTimeout);
                    maxTimeout = null;
                }
                timeout = null;
            }, delay);

            startMaxWaitTimer();
        };
    };
}
