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
 * // Initialize and use
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

    /** Debounced version of the save function, created during initialization */
    private debouncedSave?: () => void;

    /**
     * Creates a StateManager with a load callback and optional save callbacks.
     *
     * @param loadCallback - Async or sync function to load state data.
     *                      Should return the complete state object or a Promise resolving to it.
     * @param saveCallback - Optional async or sync function to persist state changes.
     *                      Receives a deep clone of the current state as parameter.
     * @param debounceOptions - Optional configuration for debouncing save operations:
     *                         - delay: Milliseconds to wait after last change (default: 0)
     *                         - maxWait: Maximum milliseconds before forcing save (default: 0 = disabled)
     *                         - immediate: Execute save immediately on first change (default: false)
     *
     * @throws {Error} Re-throws any errors from callback initialization
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
                    console.error(
                        'StateManager: Failed to save state to storage:',
                        error
                    );
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
     * @throws {Error} Any error thrown by the loadCallback, after logging it to console
     *
     * @example
     * ```typescript
     * const manager = new StateManager(loadFn, saveFn);
     * await manager.load(); // Initialize state from storage
     * console.log(manager.state); // Now contains loaded data
     * ```
     */
    async load(): Promise<void> {
        if (!this.#loadCallback) return;

        try {
            const loadedData = await this.#loadCallback();

            // Use structuredClone to create a deep copy, preventing reference sharing
            // between the loaded data and our internal state
            Object.assign(this.state, structuredClone(loadedData));
        } catch (error) {
            console.error(
                'StateManager: Failed to load state from storage:',
                error
            );
            throw error;
        }
    }

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
     * @throws {Error} Any error thrown by the saveCallback during execution
     *                 (note: with debouncing, errors may be thrown asynchronously)
     *
     * @example
     * ```typescript
     * manager.state.theme = 'dark'; // Modify state
     * await manager.save(); // Trigger save (may be debounced)
     * ```
     */
    async save(): Promise<void> {
        if (this.debouncedSave) {
            this.debouncedSave();
        }
        // Note: With debouncing, this returns immediately while the actual
        // save may happen later. Errors from debounced saves will be logged
        // but not propagated to this caller.
    }

    #debounce<T extends (...args: any[]) => Promise<any>>(
        fn: T,
        {
            immediate = false,
            delay = 1000,
            maxWait,
        }: { immediate?: boolean; delay?: number; maxWait?: number } = {}
    ): (...args: Parameters<T>) => void {
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
    }
}
