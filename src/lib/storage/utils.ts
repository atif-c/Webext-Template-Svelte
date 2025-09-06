import browser from 'webextension-polyfill';

const useLocalStorage = true;

/**
 * Returns the storage area based on the current `useLocalStorage` flag.
 * @returns {browser.Storage.StorageArea}
 */
export const getStorageArea = (): browser.Storage.StorageArea => {
    return useLocalStorage ? browser.storage.local : browser.storage.sync;
};

/**
 * Recursively cleans an object against a template.
 * - Removes unknown keys
 * - Adds missing keys from the template
 * - Resets values of incorrect types
 * - Recurses into nested objects and arrays (including arrays of objects)
 *
 * @template T
 * @param {Record<string, any>} object - Any object to clean
 * @param {T} template - Template defining valid keys and default values
 * @returns {T} Cleaned object matching the template structure
 */
export function cleanObject<T extends Record<string, any>>(
    object: Record<string, any> = {},
    template: T
): T {
    // Helper to clean nested objects recursively
    const cleanNestedObject = <U extends Record<string, any>>(
        userObj: Record<string, any>,
        templateObj: U
    ): U => {
        return cleanObject(userObj, templateObj);
    };

    // Helper to clean arrays recursively if template array's first element is an object
    const cleanArray = <U>(userArr: unknown[], templateArr: U[]): U[] => {
        if (templateArr.length === 0) return []; // no template to clean against

        const templateItem = templateArr[0];
        if (
            typeof templateItem === 'object' &&
            templateItem !== null &&
            !Array.isArray(templateItem)
        ) {
            // Recursively clean each array item if it's an object
            return userArr.map(item =>
                typeof item === 'object' &&
                item !== null &&
                !Array.isArray(item)
                    ? cleanObject(item as Record<string, any>, templateItem)
                    : templateItem
            );
        } else {
            // Primitive array items - accept user array if all items are same type as template item
            const typeOfTemplateItem = typeof templateItem;
            if (userArr.every(item => typeof item === typeOfTemplateItem)) {
                return userArr as U[];
            }
            return templateArr;
        }
    };

    const result = {} as T;

    for (const [key, def] of Object.entries(template)) {
        const val = object[key];

        const defType = typeof def;
        const defIsArray = Array.isArray(def);

        if (defType === 'object' && def !== null && !defIsArray) {
            // Nested object
            result[key as keyof T] =
                typeof val === 'object' && val !== null && !Array.isArray(val)
                    ? cleanNestedObject(val as Record<string, any>, def)
                    : def;
        } else if (defIsArray) {
            if (Array.isArray(val) && val.length > 0) {
                result[key as keyof T] = cleanArray(val, def) as T[keyof T];
            } else {
                result[key as keyof T] = def as T[keyof T];
            }
        } else {
            // Primitive value
            result[key as keyof T] = (
                typeof val === defType ? val : def
            ) as T[keyof T];
        }
    }

    return result;
}
