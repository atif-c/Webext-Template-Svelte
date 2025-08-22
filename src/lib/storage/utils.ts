import browser from 'webextension-polyfill';

const useLocalStorage = true;

/**
 * Returns the storage area based on the current `useLocalStorage` flag.
 * @returns {browser.Storage.StorageArea}
 */
export function getStorageArea(): browser.Storage.StorageArea {
    return useLocalStorage ? browser.storage.local : browser.storage.sync;
}

/**
 * Recursively cleans an object against a template.
 * - Removes unknown keys
 * - Adds missing keys from the template
 * - Resets values of incorrect types
 * - Recurses into nested objects and arrays (including arrays of objects)
 *
 * @template T
 * @param {Partial<Record<keyof T, any>>} object - object to clean
 * @param {T} template - Template defining valid keys and default values
 * @returns {T} Cleaned object matching the template structure
 */
export function cleanObject<T extends object>(
    object: Partial<Record<keyof T, any>> = {},
    template: T
): T {
    // Helper to clean nested objects recursively
    function cleanNestedObject(userObj: any, templateObj: any): any {
        return cleanObject(userObj, templateObj);
    }

    // Helper to clean arrays recursively if template array's first element is an object
    function cleanArray(userArr: any[], templateArr: any[]): any[] {
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
                    ? cleanObject(item, templateItem)
                    : templateItem
            );
        } else {
            // Primitive array items - accept user array if all items are same type as template item
            const typeOfTemplateItem = typeof templateItem;
            if (userArr.every(item => typeof item === typeOfTemplateItem)) {
                return userArr;
            }
            return templateArr;
        }
    }

    const result: Partial<T> = {};

    for (const [key, def] of Object.entries(template)) {
        const val = object[key as keyof T];

        const defType = typeof def;
        const defIsArray = Array.isArray(def);

        if (defType === 'object' && def !== null && !defIsArray) {
            // Nested object
            result[key as keyof T] =
                typeof val === 'object' && val !== null && !Array.isArray(val)
                    ? cleanNestedObject(val, def)
                    : def;
        } else if (defIsArray) {
            if (Array.isArray(val) && val.length > 0) {
                result[key as keyof T] = cleanArray(val, def) as T[keyof T];
            } else {
                result[key as keyof T] = def as unknown as T[keyof T];
            }
        } else {
            // Primitive value
            result[key as keyof T] = typeof val === defType ? val : def;
        }
    }

    return result as T;
}
