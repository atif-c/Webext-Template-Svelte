# Svelte 5 Web Extension Template

A web extension template built using Svelte 5, TypeScript, and Vite. Supports both Firefox and Chromium, with a fast dev and build pipeline.

-   Cross-browser API compatibility via [**webextension-polyfill**](https://github.com/mozilla/webextension-polyfill)
-   [**Svelte 5**](https://github.com/sveltejs/svelte) JavaScript framework
-   [**Vite**](https://github.com/vitejs/vite) for builds
-   Live reloading in Firefox dev mode via [**web-ext**](https://github.com/mozilla/web-ext)
-   Custom build script for optimised **Firefox** and **Chromium** bundles
-   Automatic ZIP packaging for distribution

## Quick Start

### Prerequisites

-   Node.js
-   npm

### Setup

```bash
# Clone this repo
git clone https://github.com/atif-c/Starter-Web-Extension
cd starter-web-extension

# Install dependencies
npm install

# Start development (Firefox)
npm run dev
```

Your extension will be built and loaded in Firefox with auto-reload enabled

### Development

#### For Firefox Development

```bash
npm run dev
```

This will:

-   Build the extension for Firefox
-   Launch Firefox with the extension loaded
-   Start file watching for auto-rebuilds
-   Auto-reload on changes

#### Manual Building

Build for specific browser:

```bash
npm run build:firefox    # Firefox only
npm run build:chromium   # Chromium only
```

Build for both browsers:

```bash
npm run build           # Both Firefox and Chromium
```

#### File Watching (without browser launch)

```bash
npm run watch:firefox   # Watch and rebuild changes for Firefox
npm run watch:chromium  # Watch and rebuild changes for Chromium
```

### Loading the Extension

#### Firefox

1. Run `npm run build:firefox` or `npm run dev`
2. Open Firefox and go to `about:debugging`
3. Click "This Firefox"
4. Click "Load Temporary Add-on"
5. Select any file in the `dist/firefox/` directory

#### Chromium

1. Run `npm run build:chromium`
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (top-right toggle)
4. Click "Load unpacked"
5. Select the `dist/chromium/` directory

## Project Structure

```
├── build.js                   # Custom build script for extension packaging
├── src/
│   ├── assets/logo/           # Extension icons (16, 32, 48, 128px + SVG)
│   ├── lib/
│   │   ├── components/        # Svelte components
│   │   ├── storage/           # Persistent Storage system
│   │   ├── utils/             # Utility files
│   │   └── background.js      # Background script
│   ├── manifests/             # Manifest files
│   └── popup/                 # Extension popup
│       ├── popup.css
│       ├── popup.html
│       ├── Popup.svelte
│       └── popup.ts
├── dist/                      # Build outputs
│   ├── chromium.zip
│   ├── firefox.zip
│   ├── chromium/
│   ├── firefox/
│   └── vite-output/
├── package.json
├── svelte.config.js
├── tsconfig.json
├── vite.config.ts
└── web-ext-config.mjs         # Firefox web-ext configuration
```

### Core Build Files

-   **`build.js`** - Custom build script that merges the base manifest with browser-specific overrides, injects the version from package.json, combines the vite output, and generates optimised builds in the dist/ directory for both Firefox and Chromium

### UI Components

-   **`src/lib/Components/Counter.svelte`** - Displays and updates the `count` value, showcasing state management
-   **`src/popup/popup.css`** - Styles the popup page
-   **`src/popup/popup.html`** - HTML container for the popup
-   **`src/popup/Popup.svelte`** - Root Svelte component for the extension’s popup interface
-   **`src/popup/popup.ts`** - Mounts the `Popup` component to the popup page

### Storage

-   **`src/lib/storage/default-object.ts`** - Holds the default storage object used for validation
-   **`src/lib/storage/state-manager.svelte.ts`** - Generic state management class for managing reactive object state with automatic persistence.
-   **`src/lib/storage/state.svelte.ts`** - Provides a $state variable variable linked to persistent storage, automatically loads data on start, saves changes back to storage, and validates data to prevent loading or saving malformed values
-   **`src/lib/storage/utils.ts`** - Handles a variable that defines whether browser.storage should use local or sync storage, and provides the cleanObject function for data validation

### Manifest

The template uses a three-part manifest system:

-   **`src/manifests/manifest.base.json`** - Base manifest containing properties that should be used for all extension build targets
-   **`src/manifests/manifest.chromium.json`** - Chromium-specific manifest overrides and additions
-   **`src/manifests/manifest.firefox.json`** - Firefox-specific manifest overrides and additions

The build script automatically merges these files and injects the current version from `package.json`

### Other

-   **`src/lib/background.js`** - Placeholder background script where you can add background processes, event listeners, and service worker functionality
-   **`src/lib/utils/debounce.ts`** - Debounce helper for the autosave system, rapid changes to stored data doesn’t trigger excessive save operations.

## Advanced Features

### Storage Management

The template includes a reliable storage system:

-   Exposes a reactive Svelte state variable for seamless UI updates
-   Syncs automatically with browser storage (configurable for `local` vs `sync`)
-   Validates data integrity against a default schema
-   Uses debounced autosaving to prevent excessive writes
-   Falls back to defaults when data is missing or malformed

### Development Workflow

The development setup is optimised for rapid iteration:

1. **File Watching**: Automatic rebuilds on any source change
2. **Hot Reloading**: Extension reloads automatically in Firefox

## Customisation

### Icons

Replace the logo files in `src/assets/logo/` with your own icons. You need:

-   `logo-16.png` (16x16)
-   `logo-32.png` (32x32)
-   `logo-48.png` (48x48)
-   `logo-128.png` (128x128)
-   `logo.svg` (vector source)

Use [**svg-2-png**](https://github.com/atif-c/svg-2-png) to generate all required PNG sizes from your SVG logo

## Scripts Reference

| Script                   | Description                         |
| ------------------------ | ----------------------------------- |
| `npm run dev`            | Full development mode (Firefox)     |
| `npm run build`          | Build for both browsers             |
| `npm run build:firefox`  | Build Firefox extension             |
| `npm run build:chromium` | Build Chrome extension              |
| `npm run watch:firefox`  | Watch files and rebuild for Firefox |
| `npm run watch:chromium` | Watch files and rebuild for Chrome  |
| `npm run start:firefox`  | Launch Firefox with extension       |
| `npm run vite:dev`       | Vite development server             |
| `npm run vite:build`     | Vite build only                     |
| `npm run check`          | TypeScript and Svelte type checking |

## Distribution

Production-ready ZIP files are automatically created in `dist/`:

-   `firefox.zip`
-   `chromium.zip`

## Dependencies

### Core

-   **Vite**: Build tool and development server
-   **Svelte 5**: Reactive Javascript Framework
-   **TypeScript**: Full type safety and IntelliSense
-   **webextension-polyfill**: Standardized browser API polyfill for cross-browser compatibility

### Development Tools

-   **archiver**: Automated ZIP file creation for distribution
-   **chokidar-cli**: File watching for auto-rebuilds
-   **concurrently**: Parallel command execution
-   **web-ext**: Official Firefox extension development tool
