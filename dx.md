# wackyinc/ — wbOS v5.2 Complete Documentation

> **Project:** wackybox.org — wbOS (Wackybox OS)
> **Version:** 5.2
> **Description:** A browser-based desktop environment simulating a full operating system
> **Host:** https://wackybox.org/ (GitHub Pages with custom domain)

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [File Inventory](#2-file-inventory)
3. [index.html — Entry Point / Shell](#3-indexhtml--entry-point--shell)
4. [style.css — Visual Styling](#4-stylecss--visual-styling)
5. [core.js — Core Logic & Settings](#5-corejs--core-logic--settings)
6. [ui.js — UI Rendering & Window Management](#6-uijs--ui-rendering--window-management)
7. [apps.js — Built-in Applications](#7-appsjs--built-in-applications)
8. [desktop-items.json — File System Definition](#8-desktop-itemsjson--file-system-definition)
9. [default-theme.json — Default Theme Preset](#9-default-themejson--default-theme-preset)
10. [manifest.json — PWA Manifest](#10-manifestjson--pwa-manifest)
11. [pennies.html — Google Homepage Clone](#11-pennieshtml--google-homepage-clone)
12. [fake_computer — Linux ELF Demo Binary](#12-fake_computer--linux-elf-demo-binary)
13. [CNAME — Custom Domain](#13-cname--custom-domain)
14. [README.md — Project Description](#14-readmemd--project-description)
15. [Settings System Reference](#15-settings-system-reference)
16. [Sound System Reference](#16-sound-system-reference)

---

## 1. Architecture Overview

wbOS is a **100% client-side single-page application** with no backend server. It runs entirely in the browser using vanilla JavaScript, CSS, and HTML. Persistence is handled through **localStorage**. The 3D wallpaper uses **Three.js** with custom GLSL shaders. Audio uses the **Web Audio API** for sound synthesis.

### Load Order

```
index.html
  ├── style.css           (loaded first)
  ├── core.js             (loaded second — defines globals, settings, init)
  ├── ui.js               (loaded third — window/desktop/mobile UI)
  └── apps.js             (loaded fourth — all built-in applications)

External dependencies (CDN):
  ├── Three.js r138       (3D rendering)
  ├── Three.js RGBELoader (HDR environment loader)
  ├── Three.js OrbitControls (camera controls)
  └── JSZip 3.10.1       (in-browser ZIP extraction)
```

### Data Flow

```
desktop-items.json ──────┐
default-theme.json ──────┤
                         ├──> core.js:initializeDesktop()
localStorage settings ───┤         │
localStorage custom ─────┘         │
                                   ▼
                            desktopItems[] ──> renderUI()
                                   │
                                   ├── desktop icons (pagination)
                                   ├── mobile icons (pagination)
                                   ├── start menu
                                   └── taskbar
                                   │
                            User clicks icon ──> launchItem()
                                   │
                                   ├── system apps (apps.js)
                                   ├── folders (openExplorerApp)
                                   ├── locked folders (password modal)
                                   ├── files (audio/video/image/text/zip app)
                                   └── web apps (iframe window)
```

---

## 2. File Inventory

| # | File | Type | Size | Purpose |
|---|------|------|------|---------|
| 1 | `index.html` | HTML | ~130 lines | Main shell / entry point |
| 2 | `style.css` | CSS | ~2000+ lines | All visual styling |
| 3 | `core.js` | JS | ~700+ lines | Core logic, settings, wallpaper, sound |
| 4 | `ui.js` | JS | ~700+ lines | Desktop icons, windows, taskbar, mobile |
| 5 | `apps.js` | JS | ~2500+ lines | All built-in applications |
| 6 | `desktop-items.json` | JSON | ~100 lines | File system / folder definitions |
| 7 | `default-theme.json` | JSON | 17 lines | Default theme preset |
| 8 | `manifest.json` | JSON | 17 lines | PWA manifest |
| 9 | `pennies.html` | HTML | ~large | Google homepage clone |
| 10 | `fake_computer` | ELF binary | ~large | Linux demo executable |
| 11 | `CNAME` | TXT | 1 line | GitHub Pages custom domain |
| 12 | `README.md` | MD | 3 lines | Project description |

---

## 3. index.html — Entry Point / Shell

**File:** `wackyinc/index.html`

### Head

```html
<title>wbOS! v5.2</title>
```

- **Fonts:** Google Fonts `Share Tech Mono` (mono) and `Outfit` (sans)
- **External Libraries:**
  - `three@0.138.0` (core + RGBELoader + OrbitControls)
  - `jszip@3.10.1`
- **Meta:** viewport with `user-scalable=no, viewport-fit=cover`
- **Initial body class:** `theme-mts-new`

### DOM Structure

```
body.theme-mts-new
└── #desktop-root
    ├── #fancy-wallpaper-canvas      <canvas> — Three.js 3D wallpaper
    ├── #desktop-reflection-overlay  <div> — light reflection overlay
    ├── #desktop-icon-container      <div> — desktop icon grid (pagination + dots)
    ├── #window-area                 <div> — all desktop windows are injected here
    ├── #start-menu                  <div> — Start menu (populated by ui.js)
    │   └── #start-menu-content
    │       ├── h4 + #start-programs
    │       └── .menu-section
    │           ├── h4 + #start-docs
    ├── .taskbar.taskbar-bottom
    │   ├── #start-button            "Start"
    │   ├── #quick-launch-bar        Pinned app icons
    │   ├── #taskbar-separator
    │   ├── #task-items              Open window buttons
    │   └── #system-tray
    │       ├── #tray-applets
    │       ├── #system-clock-applet Clock (clickable → opens Clock app)
    │       └── #show-desktop-button Show desktop toggle
    ├── #mobile-top-bar              [mobile only]
    │   ├── #mobile-menu-btn         ☰ hamburger
    │   └── #mobile-clock
    ├── #mobile-homescreen           [mobile only]
    │   ├── #mobile-icon-pages       Icon pages
    │   └── #mobile-page-dots        Page indicator dots
    ├── #mobile-app-container        [mobile only] — app pages injected here
    ├── #mobile-sidebar              [mobile only] — slide-in sidebar
    │   ├── .sidebar-header          "wbOS! v5.2"
    │   ├── #mobile-home-btn         ⌂ Home
    │   └── #mobile-task-list        Open apps list
    └── #mobile-sidebar-overlay      [mobile only] — backdrop
```

---

## 4. style.css — Visual Styling

**File:** `wackyinc/style.css`

### CSS Custom Properties (`:root`)

**Fonts:**
```css
--font-mono: 'Share Tech Mono', 'Courier New', monospace;
--font-sans: 'Outfit', sans-serif;
```

**Theme Colors (default):**
| Variable | Default Value |
|----------|---------------|
| `--theme-bg-primary` | `#00000e` |
| `--theme-bg-secondary` | `#000000` |
| `--theme-bg-tertiary` | `#000022` |
| `--theme-text-primary` | `#00ff00` |
| `--theme-text-secondary` | `#00ffff` |
| `--theme-border-color` | `#ff0000` |
| `--theme-window-shadow` | `0 0 15px rgba(255, 0, 0, 0.4)` |
| `--theme-accent-primary` | `#ff8800` |
| `--theme-accent-text` | `#ffffff` |
| `--theme-icon-text-shadow` | `0 0 4px #000000` |

**Glass/Effects:**
- `--glass-tint`: `0, 0, 14` (RGB components)
- `--window-opacity`: `0.1`
- `--glass-blur`: `20px`
- `--theme-border-radius`: `12px`

**SVG Icon Data URIs** — Each is an inline SVG with gradients and shadows:
- `--svg-folder` — Yellow folder with paper
- `--svg-locked-folder` — Yellow folder with lock icon
- `--svg-document` — White document with folded corner
- `--svg-code` — Dark code file with `</>` brackets
- `--svg-audio` — CD disc with green play button
- `--svg-video` — Film reel circle
- `--svg-image` — Frame with landscape (sun, mountains)
- `--svg-zip` — Yellow file with zipper
- `--svg-unknown` — Gray circle with `?`
- `--svg-chat` — Two overlapping chat bubbles
- `--svg-draw` — Paint palette with paintbrush
- `--svg-globe` — Blue earth globe
- `--svg-present` — Presentation chart bars
- `--svg-computer` — Monitor with gear icon
- `--svg-space` — Blue orb with checkmark
- `--svg-notepad` — Yellow notepad with spiral rings
- `--svg-settings` — Monitor with "conf" text
- `--svg-calculator` — Calculator with buttons
- `--svg-browser` — Alias to `--svg-globe`
- `--svg-explorer` — Folder with magnifying glass
- `--svg-about` — Purple orb with "i"
- `--svg-terminal` — Terminal screen with `>_` prompt
- `--svg-themes` — TV-shaped icon
- `--svg-meaty` — Audio/Disc icon

### Key CSS Sections (truncated)

The remainder of the CSS (too large to read in full) defines styles for:
- **Desktop & body** — background, overflow, cursor
- **Icons** — `.icon`, `.icon-img`, `.icon-name`, sizes (small/medium/large), selected state
- **Windows** — `.window`, `.window-header`, `.window-title`, `.window-controls`, `.window-content`, `.maximized`, `.minimized`, `.dragging`, `.opening`/`.closing` animations
- **Taskbar** — `.taskbar`, positions (top/bottom/left), `.task-item`, `.quick-launch-btn`, `.system-tray`, `.tray-clock`, `#show-desktop-button`
- **Start menu** — `#start-menu`, `#start-menu-layout`, left/right panes, search box, tree view, shutdown button
- **Mobile** — `#mobile-top-bar`, `#mobile-homescreen`, `#mobile-app-container`, `#mobile-sidebar`, page dots
- **App-specific** — calculator, clock, terminal, browser, explorer, settings, theme app, notepad, media player, image viewer, text viewer, error window
- **Theme variants** — `.theme-mts-new`, `.theme-cameron`, `.theme-light`, `.theme-dark`, `.theme-retro`, `.theme-neon`, `.theme-soft`, `.theme-wnt`
- **Animations** — window open/close, minimize, spinner

---

## 5. core.js — Core Logic & Settings

**File:** `wackyinc/core.js`

### Constants

```javascript
const BASE_URL = 'https://wackybox.org/';
const MEDIA_PLAYER_APP_URL = `${BASE_URL}media?=`;
const SETTINGS_KEY = 'wackybox_settings_v9';
const CUSTOM_APPS_KEY = 'wackybox_custom_apps_v1';
```

### Global Variables

| Variable | Description |
|----------|-------------|
| `desktopItems` | Master array of all desktop items (merged from JSON + system + custom) |
| `customDesktopItems` | User-added web apps, persisted to localStorage |
| `LOCKED_FOLDER` | Password-protected "Wackycom media vault" object |
| `systemApps` | Array of 11 system app descriptors |
| `highestZIndex` | Counter for window z-index stacking (starts at 1000) |
| `openWindows` | Object of all currently open window objects `{id, title, element, iconClass}` |
| `openMobileAppOrder` | Stack of open mobile window IDs |
| `audioCache` | Cached HTMLAudioElement objects for UI sounds |
| `synthAudioContext` | Shared Web Audio API AudioContext for sound synthesis |
| `synthMasterGain` | Master gain node for synthesized sounds |

### System Apps Definition

```javascript
const systemApps = [
    { name: 'Calculator',     type: 'system_app', class: 'webapp-calculator', action: 'openCalculator' },
    { name: 'Clock',          type: 'system_app', class: 'webapp-clock',      action: 'openClock' },
    { name: 'About',          type: 'system_app', class: 'webapp-about',      action: 'openAbout' },
    { name: 'Notepad',        type: 'system_app', class: 'webapp-notepad',    action: 'openNotepad' },
    { name: 'Settings',       type: 'system_app', class: 'webapp-settings',   action: 'openSettings' },
    { name: 'Browser',        type: 'system_app', class: 'webapp-browser',    action: 'openBrowser' },
    { name: 'File Explorer',  type: 'system_app', class: 'webapp-explorer',   action: 'openExplorer' },
    { name: 'Terminal',       type: 'system_app', class: 'webapp-terminal',   action: 'openTerminal' },
    { name: 'Theme studio',   type: 'system_app', class: 'webapp-themes',     action: 'openThemeApp' },
    { name: 'Video Player',   type: 'system_app', class: 'webapp-video',      action: 'openVideoPlayer' },
    { name: 'Meaty Player',   type: 'system_app', class: 'webapp-meaty',      action: 'openMeatyPlayer' },
];
```

### Functions

#### Helper Functions

| Function | Description |
|----------|-------------|
| `isMobile()` | Returns true if viewport ≤768px wide or landscape ≤500px tall |
| `hexToRgb(hex)` | Converts hex color string to `{r, g, b}` object |
| `getContrastColor(hexColor)` | Returns `#000000` or `#ffffff` based on luminance |
| `getDarkTintRgb(hex, factor, baseR, baseG, baseB)` | Creates dark tinted RGB from a color |
| `rgbToString(rgbObj)` | Converts `{r, g, b}` to CSS `rgb(r, g, b)` string |

#### Settings System

**`appSettings` — Master Settings Object (~50 properties)**

**Wallpaper & Display:**
| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `wallpaper` | string | `'default'` | Wallpaper preset ID |
| `wallpaperCustom` | string\|null | `null` | Custom wallpaper data URL or CSS |
| `wallpaperStyle` | string | `'cover'` | `cover`/`contain`/`stretch`/`tile`/`center` |
| `iconSize` | string | `'medium'` | `small`/`medium`/`large` |

**Theme & Colors:**
| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `theme` | string | `'mts-new'` | Theme class name |
| `textPrimary` | string | `''` | CSS color override |
| `textSecondary` | string | `''` | CSS color override |
| `accentPrimary` | string | `''` | CSS color override |
| `borderColor` | string | `''` | CSS color override |
| `titleColor` | string | `'auto'` | Window title text color |
| `autoContrastTitle` | boolean | `true` | Auto black/white title text |

**Glass & 3D Effects:**
| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `graphicsGlass` | boolean | `true` | Glass transparency on windows |
| `graphics3d` | boolean | `false` | Three.js interactive wallpaper |
| `glassTint` | string | `'#ffffff'` | Glass color tint |
| `windowOpacity` | number | `0.25` | Window frame transparency |
| `contentOpacity` | number\|null | `null` | Inner content transparency |
| `windowCornerRadius` | number\|null | `null` | Window corner roundness |
| `windowBorderWidth` | number\|null | `null` | Window border thickness |
| `glassBlur` | number\|null | `null` | Backdrop blur intensity |
| `lightAngle` | number | `135` | Light source angle (degrees) |
| `lightIntensity` | number | `0.25` | Light reflection strength |

**Window & Content Background:**
| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `windowBackground` | string | `''` | Override CSS |
| `windowBgType` | string | `'default'` | `default`/`solid`/`gradient` |
| `windowBgSolid` | string | `'#00000e'` | Solid color |
| `windowBgGrad1` | string | `'#f3904f'` | Gradient start |
| `windowBgGrad2` | string | `'#3b4371'` | Gradient end |
| `windowBgGradDir` | string | `'to top'` | Gradient direction |
| `contentBackground` | string | `''` | Override CSS |
| `contentBgType` | string | `'default'` | `default`/`solid`/`gradient` |
| `contentBgSolid` | string | `'#000000'` | Solid color |
| `contentBgGrad1` | string | `'#2b4c7e'` | Gradient start |
| `contentBgGrad2` | string | `'#0a0f1d'` | Gradient end |
| `contentBgGradDir` | string | `'to top'` | Gradient direction |

**Taskbar:**
| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `taskbarPosition` | string | `'bottom'` | `bottom`/`top`/`left` |
| `taskbarMode` | string | `'standard'` | `standard`/`compact` |
| `taskbarHeight` | number | `36` | Height in px |
| `taskbarSize` | number | `36` | Alias |
| `taskbarAlignment` | string | `'left'` | `left`/`center`/`right` |
| `taskbarGroupWindows` | boolean | `true` | Group by app name |
| `taskbarOpacity` | number | `0.85` | Opacity 0-1 |
| `taskbarAutohide` | boolean | `false` | Auto-hide taskbar |
| `taskbarCustomBg` | string | `''` | Custom background CSS |
| `taskbarTextColor` | string | `''` | Text color override |
| `taskbarClockColor` | string | `''` | Clock color override |
| `taskbarClockFormat` | string | `'12h'` | `12h`/`24h` |
| `taskbarShowClockSeconds` | boolean | `true` | Show seconds |
| `quickLaunchApps` | string[] | `['Browser','Terminal','Notepad','File Explorer']` | Pinned apps |

**Font:**
| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `systemFont` | string | `'default'` | `default`/`mono`/`sans`/`serif` |

**UI Sounds:**
| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `uiSounds.enabled` | boolean | `true` | Master toggle |
| `uiSounds.volume` | number | `0.5` | Volume 0-1 |
| `uiSounds.click` | string | `''` | Custom URL |
| `uiSounds.windowOpen` | string | `''` | Custom URL |
| `uiSounds.windowClose` | string | `''` | Custom URL |
| `uiSounds.error` | string | `''` | Custom URL |

**Other:**
| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `alwaysOpenInWindow` | boolean | `false` | Force iframe for web apps |
| `windowShadowBlur` | number\|null | `null` | Shadow blur override |

**Settings Persistence Functions:**
| Function | Description |
|----------|-------------|
| `saveSettings()` | Serializes `appSettings` to localStorage under `wackybox_settings_v9` |
| `saveCustomApps()` | Serializes `customDesktopItems` to localStorage under `wackybox_custom_apps_v1` |
| `loadSettings()` | Async — fetches `default-theme.json` → merges with localStorage settings → preloads sounds → calls `applySettings()` |

#### `applySettings()` — Master Settings Applicator

This function applies every setting to the DOM. Steps in order:

1. **Theme class:** Removes all theme classes from `<body>`, adds `theme-{appSettings.theme}`
2. **Glass/3D toggles:** Adds/removes `graphics-glass` and `graphics-3d` classes
3. **3D wallpaper:** Calls `initFancyWallpaper()` or `destroyFancyWallpaper()`
4. **Window background:** Sets `--window-bg-override` CSS property based on type (solid/gradient/default)
5. **Content background:** Sets `--content-bg-override` CSS property based on type
6. **Mts-new colors:** For `mts-new` theme, overrides primary/secondary/accent/border colors + generates matching dark-tinted background
7. **Lighting:** Calculates light position from angle, sets CSS vars for reflection overlay
8. **Window geometry:** Corner radius, border width, glass blur blur
9. **System font:** Sets `--theme-font-body`
10. **Opacity:** Window opacity + content opacity
11. **Glass tint:** Parses hex, sets RGB components on `--glass-tint`, generates dynamic `<style>` tag for title/button/clock colors
12. **Wallpaper:** Applies background image/gradient/data-URL to desktop with chosen style
13. **Taskbar:** Position class, alignment, autohide, height, opacity, custom background/text/clock colors
14. **Icon size:** Applies class to containers
15. **Re-renders:** Calls `renderDesktopIcons()`/`renderMobileIcons()`, `renderQuickLaunchBar()`, `renderTaskbarItems()`
16. **Clock color:** Calculates appropriate clock text contrast color

---

### 3D Wallpaper Engine (`fancyWallpaper`)

**Object:** `fancyWallpaper` — holds all Three.js references

**Initialization (`initFancyWallpaper()`):**
- Creates Three.js Scene, PerspectiveCamera (75° FOV), WebGLRenderer (transparent background)
- Creates noise texture (128×128 canvas with random grayscale)
- Creates a 6-color multi-material BoxGeometry cube (rotating)
- Creates reflection cube using custom GLSL shaders:
  - **Vertex shader:** Passes UVs, handles clipping planes
  - **Fragment shader:** Samples noise texture with animated UV distortion (radial + sinusoidal waves), applies uniform color per face
  - Clipped by a horizontal waterline plane
- Creates water plane using custom GLSL shader:
  - Gentle base ripples + expanding ring waves when cube dips in
  - Noise texture sampling for grain
  - Glassy teal/blue color with highlights/shadows
  - Distance-based fade
- Mouse tracking for cube position
- Resize handler to update camera + waterline
- Animation loop: cube rotation + mouse-following movement + automatic bobbing (sine wave) so it periodically dips into water

**Animation Behavior:**
- Cube follows mouse (x: ±3.8, y: ±2.8)
- Cube auto-bobs up and down, dipping into water every ~4 seconds
- Reflection cube mirrors position/scaled on Y axis, with wave offsets
- Water ripples strengthen when cube enters water (disturbance uniform)
- Noise texture scrolls continuously

**Cleanup (`destroyFancyWallpaper()`):**
- Cancels animation frame
- Removes event listeners
- Disposes all Three.js geometries, materials, textures, renderer

---

### `initializeDesktop()` — Application Entry Point

Called by `window.onload`:

1. `loadSettings()` — async load theme + localStorage
2. Fetch `desktop-items.json` (with error handling → `openErrorWindow`)
3. Define `LOCKED_FOLDER`:
   ```javascript
   {
     name: "Wackycom media vault",
     type: "locked_folder",
     class: "locked-folder",
     passwordHash: "4033079d33b678f4f66d37b9557df43aa629a83ab00ff5f1dc68b8182b089225",
     contents: [11 media files]
   }
   ```
4. Merge items: `desktopItems = [...filteredItems, LOCKED_FOLDER, ...systemApps, ...customDesktopItems]`
5. Call `renderUI()`
6. Call `setupStartMenu()`
7. Call `setupMobileControls()`
8. Call `setupGlobalDragSelect()`
9. Call `setupMobileGestures()`
10. Add global click listener for UI sounds (`'click'`)
11. Add first-click listener for startup sound

### Sound System

**Two-tier approach:**
1. **Custom audio files** — if user configured URLs in settings, cache and play via `HTMLAudioElement`
2. **Synthesized sounds** — fallback using Web Audio API

**Sound Types (Synthesized):**

| Sound | Waveform | Description |
|-------|----------|-------------|
| `click` | Triangle | Quick chirp 1200→150Hz, 50ms |
| `windowOpen` | Sine | Ascending arpeggio: C5→E5→G5→C6 (staggered) |
| `windowClose` | Sine | Descending arpeggio: C6→G5→E5→C5 (staggered) |
| `error` | Sawtooth | Dual lowpass-filtered buzz at 150/153Hz, 400ms |
| `startup` | Sine | Ascending chord: E3→B3→E4→A4→B4→E5, 2s |

**Key functions:**
| Function | Description |
|----------|-------------|
| `getSynthAudioContext()` | Lazily creates/resumes shared AudioContext + master gain |
| `playSynthSound(type)` | Generates oscillator/gain nodes for each sound type |
| `playUISound(soundName)` | Tries audio cache → falls back to synth |
| `preloadUISounds()` | Preloads configured audio URLs |

### Resize Observer

```javascript
const resizeObserver = new ResizeObserver(() => {
    if (isMobile()) renderMobileIcons();
    else /* debounced */ renderDesktopIcons();
});
resizeObserver.observe(document.body);
```

---

## 6. ui.js — UI Rendering & Window Management

**File:** `wackyinc/ui.js`

### Desktop Icons

#### `renderUI()`
Calls both `renderDesktopIcons()` and `renderMobileIcons()`.

#### `renderDesktopIcons()`
1. Gets `#desktop-icon-container`
2. Creates a flex wrapper `#desktop-pages-wrapper` with horizontal scroll snap
3. Creates `#desktop-page-dots` for page navigation
4. Creates a temporary hidden icon to measure icon dimensions
5. Calculates grid: `cols = floor(availableWidth / iconWidth)`, `rows = floor(availableHeight / iconHeight)`, `iconsPerPage = max(4, cols * rows)`
6. Creates page divs (100% width each) + dot indicators
7. Scroll listener updates active dot
8. Iterates `desktopItems`, places each icon in the correct page slot
9. Icons get: `dblclick` → `launchItem()`, `mousedown` → selection

#### `renderMobileIcons()`
Similar pagination but using CSS grid layout; tap-to-open instead of dblclick.

#### `createIconElement(item)`
Builds: `<div class="icon"><div class="icon-img {class}"></div><div class="icon-name">{name}</div></div>`

#### `setupGlobalDragSelect()`
- Creates a dotted-border selection box div
- On mousedown on empty desktop area: creates selection box
- On mousemove: updates box dimensions + highlights intersecting icons
- On mouseup: removes box

---

### `launchItem(item)` — Universal Launcher

**Dispatch logic:**

| Item Type | Action |
|-----------|--------|
| `type === 'folder'` with contents | Opens in File Explorer at that folder |
| `type === 'folder'` without contents | Opens via `openWebAppPrompt()` or iframe |
| `type === 'locked_folder'` | Opens password modal first, then `openLockedFolderWindow()` |
| `type === 'system_app'` | Dispatches to specific app function by `action` |
| `action === 'newTab'` | Opens file in new browser tab |
| `class === 'audio'` | Opens media player |
| `class === 'webapp-browser'` | Opens iframe window |
| `class === 'video'` | Opens video player |
| `class === 'image'` | Opens image viewer |
| `class === 'document' \|\| 'code' \|\| 'unknown'` | Opens text viewer |
| `class === 'zip'` | Opens ZIP extractor |
| Default | Opens error window |

---

### Window Management

#### `openWindow(title, contentHTML, options)`
Dispatches to desktop or mobile path based on `isMobile()`.

**Options:**
| Option | Type | Description |
|--------|------|-------------|
| `width` | string | CSS width (e.g. `'500px'`) |
| `height` | string | CSS height |
| `minWidth` | string | CSS min-width |
| `minHeight` | string | CSS min-height |
| `hideMinimize` | boolean | Hide minimize button |
| `hideMaximize` | boolean | Hide maximize button |
| `iconClass` | string | Icon class for taskbar |

#### `openDesktopWindow(windowId, title, contentHTML, options)`
1. Plays `windowOpen` sound
2. Increments `highestZIndex`
3. Creates window div with:
   - `.window` class + `.opening` animation
   - Header with title + controls (minimize/maximize/close)
   - Content div
4. Positions centered on screen (accounting for taskbar)
5. Sets up events: mousedown→bringToFront, close/minimize/maximize buttons, header dblclick→maximize
6. Calls `dragElement()` for window dragging
7. Registers in `openWindows` + adds taskbar item
8. Returns window element

#### `openMobileWindow(windowId, title, contentHTML, options)`
1. Creates mobile app page with back/close buttons + title
2. If there's already an open app, shows back button (hides close)
3. Appends to `#mobile-app-container`
4. Registers in `openWindows` + manages app order stack

#### `closeWindow(windowId, isMobileBack)`
- **Desktop:** Adds `.closing` class, on transitionend removes from DOM + deletes from tracking + re-renders taskbar
- **Mobile:** Slides out, removes from app order stack, shows previous app or homescreen

#### `minimizeWindow(windowId)`
- **Desktop:** Adds `.minimized` class (with optional `.minimizing` glass animation), re-renders taskbar
- **Mobile:** Hides app, shows homescreen

#### `maximizeWindow(windowId)`
Toggles `.maximized` class (desktop only).

#### `bringWindowToFront(windowId)`
- **Desktop:** Raises `z-index`, removes minimized state, re-renders taskbar
- **Mobile:** Shows app container, pushes to top of order stack, manages active/inactive states, updates mobile task list

#### `dragElement(elmnt)`
- Attaches mousedown to window header
- On drag: constrains to viewport, respects taskbar position
- On drag end: restores pointer-events on iframes/canvas
- Prevents dragging beyond taskbar edges
- Prevents dragging when maximized

---

### Icon Class Resolution

#### `getIconClassForTitle(title)`
Returns appropriate icon CSS class based on window title:
- `calculator` → `webapp-calculator`
- `clock` → `webapp-clock`
- `notepad` → `webapp-notepad`
- `settings`/`theme` → `webapp-settings`
- `browser` → `webapp-browser`
- `explorer`/`file` → `webapp-explorer`
- `terminal` → `webapp-terminal`
- `image` → `image`
- `video`/`player` → `video`
- `audio`/`meaty` → `audio`
- Default → `folder`

---

### Taskbar

#### `renderQuickLaunchBar()`
- Renders buttons for each app in `appSettings.quickLaunchApps`
- Each button has icon + click handler → `launchItem()`
- Right-click context menu: "Unpin from Quick Launch?"

#### `renderTaskbarItems()`
- Renders open windows as taskbar buttons
- If `taskbarGroupWindows` is true: groups windows by base title, creates grouped task items with count badges
- If false: individual task items

#### `createSingleTaskItem(container, winObj)`
- Shows icon + label (standard mode) or icon only (compact mode)
- Click: if active → minimize, if minimized/inactive → bring to front
- Right-click: context menu (pin/unpin, minimize/restore, close)

#### `createGroupedTaskItem(container, groupTitle, wins)`
- Shows icon + label + count badge
- Click cycles through windows in group
- Right-click: list windows + "Close All"

#### Context Menus
- `showTaskbarContextMenu(x, y, winObj)` — pin/unpin, minimize/restore, close
- `showGroupContextMenu(x, y, groupTitle, wins)` — individual window list, close all

---

### Start Menu

#### `setupStartMenu()`
Builds the entire Start menu HTML dynamically:

**Structure:**
```
#start-menu-layout
├── #start-menu-left
│   ├── #start-left-content
│   │   ├── #start-programs-pane
│   │   │   ├── "Pinned programs" header
│   │   │   ├── #start-pinned-programs (5 pinned apps + games)
│   │   │   └── "All programs" button
│   │   ├── #start-all-programs-pane (hidden)
│   │   │   ├── "Back" button
│   │   │   └── #start-all-programs-tree (collapsible folders)
│   │   └── #start-search-results-pane (hidden)
│   │       ├── "Search results" header
│   │       └── #start-search-results
│   └── #start-search-box
│       ├── Search icon
│       ├── #start-search-input
│       └── #start-search-clear
└── #start-menu-right
    ├── #start-user-area (avatar + "User")
    ├── #start-right-links
    │   ├── Games → openExplorer("Games")
    │   ├── Websites → openExplorer("Websites")
    │   ├── Documents → openExplorer("Documents")
    │   ├── Music & Videos → openExplorer("Media")
    │   ├── Computer → openExplorer("Computer")
    │   ├── Control Panel → openSettingsApp()
    │   ├── Command Prompt → openTerminalApp()
    │   └── Help and Support → openAboutApp()
    └── #start-shutdown-bar
        └── "Shut down" button (spinning icon + reload after 2s)
```

**Pinned Programs:** Browser, Notepad, Calculator, Theme studio, File Explorer + top 3 games from the Games folder

**All Programs:** Tree view with expandable folder nodes showing all folder items and system apps

**Search:** Live text search across all desktop items (games, programs, websites, files) with categorized results

---

### Mobile UI

#### `setupMobileControls()`
- Clock update every second (respects 12h/24h + seconds settings)
- System tray clock click → opens Clock app
- Show Desktop button → toggles minimize/restore all windows
- Menu button → opens sidebar
- Home button → shows homescreen

#### `setupMobileGestures()`
- Edge swipe: if touch starts within 30px of left edge and swipes right >70px, opens sidebar

#### `closeMobileSidebar()` / `showMobileHome(isMinimizing)` / `updateMobileTaskList()`
- Sidebar management and open-apps list rendering

---

## 7. apps.js — Built-in Applications

**File:** `wackyinc/apps.js` (~2500 lines)

---

### `openCalculatorApp()`

**Window:** 300×450, min 250×350

**UI:**
- Display input (readonly)
- 19 buttons in grid layout:
  - Functions: AC, +/-, %
  - Operators: ÷, ×, −, +
  - Digits: 0-9
  - Decimal: `.`
  - Equals: =

**Engine:**
```javascript
let state = { displayValue, firstOperand, operator, waitingForSecondOperand }
```

| Key | Behavior |
|-----|----------|
| Digit | Appends digit; resets after operator or error |
| `.` | Appends decimal if not already present |
| AC | Resets all state |
| +/- | Negates current value |
| % | Divides by 100 |
| Operator (+,−,×,÷) | Chains calculation if pending, stores operator |
| = | Computes result, clears operator |
| Division by zero | Returns `'Error'` |

**Display:** Auto-switches to scientific notation (9 decimals) when value exceeds 14 characters.

---

### `openClockApp()`

**Window:** 400×250, min 300×200

**UI:** Large time display (HH:MM:SS) + full date (Weekday, Month Day, Year)

**Engine:** `setInterval(updateAppClock, 1000)` — auto-cleans when window is removed from DOM.

---

### `findFileInSystem(fileName)`

Recursively searches `desktopItems` array for a file by name (depth-first).

---

### `getVirtualFileContent(fileName)`

**Priority order:**
1. Check `localStorage` for `wacky_file_override_{fileName}`
2. Fetch from `BASE_URL + encodeURIComponent(fileName)`
3. If file exists in system but server returns error, return empty string

---

### `openNotepadApp(fileName?)`

**Window:** 500×400

**UI:** Toolbar with Save button + status indicator + textarea

**Features:**
- Loads file content via `getVirtualFileContent()` on open
- Save: if no filename, prompts user → creates new file on desktop
- Saves to localStorage as `wacky_file_override_{filename}`
- Status: "Loading...", "Saved successfully" (auto-clear after 2s), "Failed to save"

---

### `openSettingsApp()`

**Window:** 500×650, min 400px wide

**Sections:**

| Section | Controls |
|---------|----------|
| **Appearance & Graphics** | Glass effects toggle, 3D background toggle |
| **Theme studio** | Button to open Theme studio app |
| **Layout** | Taskbar position (bottom/top/left), Taskbar mode (standard/compact), Taskbar alignment (left/center/right), Group windows, Auto-hide, Icon size |
| **System** | Configure UI Sounds button, Always open web apps in-window toggle |
| **Custom Web Apps** | Add form (name + URL), manage list (remove) |

Each control immediately applies settings via `applySettings()` + `saveSettings()`.

---

### `openBrowserApp()`

**Window:** 800×600

**UI:**
- Navigation bar: Back (disabled), Forward (disabled), Reload buttons
- URL input + Go button
- `<iframe id="browser-frame">` with sandbox attributes

**Features:**
- URL loading (auto-prepends `https://` if missing)
- Enter key to load
- Reload button
- Navigation history buttons are UI-only (disabled)

---

### `openExplorerApp(options)`

**Window:** 650×450

**UI:**
- **Toolbar:** Back/Forward buttons + Address bar + Search bar
- **Sidebar:** Shortcuts to Computer, Games, Websites, Documents, Media
- **Content area:** Icon grid of folder contents

**Engine:**
```javascript
let currentPath = ['Computer'];  // breadcrumb path
let history = [[...currentPath]]; // navigation stack
let historyIndex = 0;
let query = '';                  // search filter
```

| Feature | Description |
|---------|-------------|
| **Navigation** | Full back/forward history with enabled/disabled states |
| **Address bar** | Shows breadcrumb path (e.g. "Computer ▸ Games") |
| **Search** | Live filtering of current folder contents |
| **Sidebar** | Click to navigate; active state highlighting |
| **Content** | Renders icons via `createIconElement()`; dblclick to open (or click on mobile) |
| **Folders** | Navigate into by double-clicking |
| **Files** | Launch in appropriate app; auto-close explorer for non-folder items |
| **Start folder** | Optional `options.startFolder` to open directly into a folder |

---

### `openAboutApp()`

**Window:** 400×450, no maximize/minimize

**Content:**
- Space icon (hue-rotated)
- Title: "wbOS! v5.2"
- Text: "welcome to this particular nonsense!"
- "wackybox incorporated. technology of tomorrow, on the technology of today <3"
- "Version 5.2 - Would you look at that? More... more UI changes. Of course"

---

### `openTerminalApp()`

**Window:** 600×400

**UI:**
- `#terminal-output` — scrollable output area
- `#terminal-input-line` — prompt + input field
- Prompt format: `user@wackybox:~/Desktop$ `

**Commands:**

| Command | Arguments | Description |
|---------|-----------|-------------|
| `help` | — | Lists all available commands |
| `ls` | — | Lists current directory contents |
| `cd` | `[dir]` | Change directory (supports `..`) |
| `pwd` | — | Print working directory |
| `cat` | `[file]` | Display file content (uses `getVirtualFileContent()`) |
| `touch` | `[file]` | Create empty file |
| `rm` | `[file]` | Remove file/folder |
| `open` | `[file]` | Launch file/app |
| `sysinfo` | — | System information (OS, version, resolution, language, theme, light angle, intensity, uptime, user agent) |
| `date` | — | Current date/time |
| `clear` | — | Clear terminal |
| `echo` | `[text]` | Print text |
| `theme` | `[name]` | Switch theme (light/dark/retro/neon/soft/wnt/cameron/mts-new) |
| `poo` | — | 💩 Easter egg: "💩 Stinky!" |

**Features:**
- **Command history:** ArrowUp/ArrowDown navigation through `terminalHistory` array
- **Tab completion:** Completes command names and file/folder names (for `cat`, `rm`, `open`, `cd`)
- **Current directory:** Tracks `terminalState.currentFolder` for context-sensitive `ls`/`cd`/`cat`/`touch`/`rm`/`open`
- Async `cat` — uses `await getVirtualFileContent()` for remote file loading

---

### `openThemeApp()` (~600+ lines)

**Window:** 450×650

This is the most complex app — a comprehensive theme/visual customization studio.

**Sections:**

| Section | Controls |
|---------|----------|
| **Color theme** | Toggle buttons: Mts new / Cameron's theme |
| **Mts new colors** | Color pickers: Primary text, Secondary text, Accent, Border + Reset button (only visible when Mts new is active) |
| **Window background** | Type selector (default/solid/gradient) + color pickers + gradient direction |
| **Content background** | Type selector (default/solid/gradient) + color pickers + gradient direction |
| **Light angle** | Range slider 0-360° with value display |
| **Light intensity** | Range slider 0-100% with value display |
| **Window title text** | Color picker + Auto-contrast checkbox |
| **Window tint (glass)** | Color picker + Reset to white button |
| **Window frame transparency** | Range slider 0.1-1.0 |
| **Window content transparency** | Range slider 0.05-1.0 |
| **Preset savefile** | Download JSON / Import JSON file buttons |
| **Window corner radius** | Range slider 0-24px |
| **Window border width** | Range slider 1-6px |
| **Glass backdrop blur** | Range slider 0-35px |
| **System font** | Dropdown: Default / Mono / Sans / Serif |
| **Taskbar config** | Height slider 28-64px, Alignment dropdown, Group checkbox, Opacity slider, Clock format (12h/24h), Show seconds checkbox, Custom background color + Reset, Text color + Reset, Clock color + Reset |
| **Wallpaper** | Clickable preview grid (7 presets with background CSS) + active state |
| **Custom wallpaper** | File upload button |
| **Wallpaper style** | Dropdown: Fill/Cover, Fit/Contain, Stretch, Tile, Center |
| **Custom gradient** | Two color pickers + direction selector + Apply button |

All controls immediately save to `appSettings` and call `applySettings()` + `saveSettings()`.

---

### Additional App Functions (referenced from apps.js — truncated from read):

| Function | Description |
|----------|-------------|
| `openSoundSettings()` | Sound configuration UI: enable/disable, volume, custom URLs for each sound type |
| `openIframeWindow(title, url)` | Opens any URL in an iframe-based window |
| `openWebAppPrompt(item)` | Opens folder items as web URLs; prompts on mobile |
| `openPasswordModal(folderName, expectedPassword, onSuccessCallback)` | SHA-256 locked folder password prompt |
| `openLockedFolderWindow(folderName, contents)` | Displays password-protected folder contents |
| `openVideoPlayerApp(fileName, customUrl)` | HTML5 `<video>` player |
| `openMediaPlayerWindow(fileName, customUrl)` | HTML5 `<audio>` player |
| `openImageViewWindow(fileName, customUrl)` | Full-size image display |
| `openTextViewWindow(fileName)` | Text file viewer |
| `openFileInNewTab(fileName)` | Opens `BASE_URL + fileName` in new tab |
| `openErrorWindow(fileName, message)` | Error dialog |
| `openZipWindow(fileName, customUrl)` | In-browser ZIP extraction using JSZip (preview images/audio/video) |

---

## 8. desktop-items.json — File System Definition

**File:** `wackyinc/desktop-items.json`

**Structure:**
```json
[
  {
    "name": "Games",
    "type": "folder",
    "class": "folder",
    "contents": [ ... ]
  },
  ...
]
```

### Games Folder (15 items)

| Name | Link |
|------|------|
| bloons | https://wackybox.org/bloons |
| ffish | https://wackybox.org/ffish |
| JB | https://wackybox.org/JB |
| luigi | https://wackybox.org/luigi |
| mario | https://wackybox.org/mario |
| minecraft | https://wackybox.org/minecraft |
| quarb | https://wackybox.org/quarb |
| quarb2 | https://wackybox.org/quarb2 |
| space | https://wackybox.org/space |
| space2 | https://wackybox.org/space2 |
| starfall | https://wackybox.org/starfall |
| tabletop | https://wackybox.org/tabletop |
| tdb | https://wackybox.org/tdb |
| w3d | https://wackybox.org/w3d |
| TTAB | https://www.talktoabutt.site |

### Websites & Projects Folder (30 items)

504, 7, assets, auduino, BPLAY, chat, chat2, CHRIS, COLDSOREPRESENTATION, computer, curl, D, draw, E, encrumbt, HP, media, msst, old, ourworld/outside, pc, placeholder, present, present3D, raster, real, rootsite, sacremento, stop-it, wbs services

All linked to `https://wackybox.org/{name}` except `wbs services` (external) and `ourworld/outside` (URL-encoded path).

### Documents & Code Folder (6 items)

| Name | Type | Class |
|------|------|-------|
| archives/MAIN.pmp | file | code |
| index.html | file | code (opens in new tab) |
| pennies.html | file | code (opens in new tab) |
| archives/restore-point.pmp | file | code |
| documents/CNAME | file | document |
| documents/README.md | file | document |

### Media & Files Folder (5 items)

| Name | Type | Class |
|------|------|-------|
| media/Bliss_(Windows_XP).png | file | image |
| media/sunflowers_puresky_4k.hdr | file | image |
| media/Caligula.webm | file | video |
| media/craft.mp4 | file | video |
| archives/Projecdfgvb.zip | file | zip |

---

## 9. default-theme.json — Default Theme Preset

**File:** `wackyinc/default-theme.json`

```json
{
  "theme": "mts-new",
  "graphicsGlass": true,
  "graphics3d": false,
  "glassTint": "#142d25",
  "windowOpacity": 0.35,
  "taskbarPosition": "bottom",
  "taskbarMode": "standard",
  "taskbarHeight": 36,
  "taskbarAlignment": "left",
  "taskbarGroupWindows": true,
  "taskbarOpacity": 0.85,
  "taskbarClockFormat": "12h",
  "taskbarShowClockSeconds": true,
  "windowCornerRadius": 12,
  "windowBorderWidth": 1.5,
  "glassBlur": 25,
  "systemFont": "default"
}
```

Loaded on first visit and merged with any existing localStorage settings.

---

## 10. manifest.json — PWA Manifest

**File:** `wackyinc/manifest.json`

```json
{
  "name": "Wackybox OS",
  "short_name": "wbOS",
  "description": "Wackybox Incorporated Desktop Environment",
  "start_url": "./desktop.html",
  "display": "standalone",
  "background_color": "#2e7141",
  "theme_color": "#f0f0f0",
  "icons": [
    {
      "src": "https://wackybox.org/favicon.ico",
      "sizes": "64x64 32x32 24x24 16x16",
      "type": "image/x-icon"
    }
  ],
  "orientation": "any"
}
```

**Note:** `start_url` points to `./desktop.html` but the actual file is `index.html`.

---

## 11. pennies.html — Google Homepage Clone

**File:** `wackyinc/pennies.html`

A clone/satire of the Google.com homepage:
- Custom CSS with light/dark mode support via `prefers-color-scheme`
- Uses Google favicon
- Full Google-style HTML structure (search box, buttons, footer)
- Responsive design

---

## 12. fake_computer — Linux ELF Demo Binary

**File:** `wackyinc/fake_computer` (binary, 32KB+)

**Type:** Linux x86-64 ELF executable

**Identified strings:**
- "fake computer - wbs"
- "FAKE COMPUTER - WBS - HACKTRIX APII"
- "HACKTRIX APII. FROM WBS."
- "FAKE COMPUTER" / "LINUX PC DEMO 32K"
- "Failed to load required system libraries (X11, GL, or ALSA)."
- "Failed to open X display."
- "No suitable GLX visual found."
- "Failed to create GLX context."
- "Warning: Audio initialization failed. Proceeding without sound."
- "Shader compilation error:" / "Failed to link shader program."

**Libraries:** `libc.so.6`, `libm.so.6`, `libdl`

**GLSL Shaders embedded:**
- Vertex shader: passthrough `gl_Position = gl_Vertex;`
- Fragment shader ~350 lines:
  - Uniforms: `iTime`, `iResolution`, `uText[256]`, `uFont[40]`, `uMode`
  - 11 different 3D SDF (Signed Distance Function) scenes:
    1. Rotating cylinder/tube
    2. Repeating spheres with pulsing
    3. Rotating torus with sine wave
    4. Fractal menger-like geometry
    5. Undulating terrain plane
    6. Three-blob metaball smin
    7. Rotating gyroid-like pattern
    8. Procedural skyscraper buildings
    9. Rotating octahedron grid
    10. Repeating disc stacks
    11. Morphing shapes (sphere→cube→torus→octahedron→sphere)
  - Matrix code rain effect (first 12 seconds)
  - Text scroller (moving ticker text)
  - Static outro text renderer (4 lines)
  - Normal calculation, lighting (diffuse + specular)

This is a **demoscene-style executable** that renders 3D animations with text overlays, using GLX for OpenGL and ALSA for audio.

---

## 13. CNAME — Custom Domain

**File:** `wackyinc/CNAME`

Content: `wackybox.org`

Configures GitHub Pages to use the custom domain `wackybox.org`.

---

## 14. README.md — Project Description

**File:** `wackyinc/README.md`

```markdown
# wackybox-incorporated

hosting embedded html programs compiled elsewhere for wackybox.org until further notice
```

---

## 15. Settings System Reference

### Storage Keys

| Key | Data | Format |
|-----|------|--------|
| `wackybox_settings_v9` | All app settings | JSON |
| `wackybox_custom_apps_v1` | User-added web apps | JSON array |
| `wacky_file_override_{name}` | Notepad file content | Raw text |

### Settings Load Priority

1. `default-theme.json` (base defaults)
2. localStorage `wackybox_settings_v9` (user overrides, merged on top)
3. Individual app settings changes

### Theme Classes

| Class | Name |
|-------|------|
| `theme-light` | Light |
| `theme-dark` | Dark |
| `theme-retro` | Retro |
| `theme-neon` | Neon |
| `theme-soft` | Soft |
| `theme-wnt` | Windows NT |
| `theme-cameron` | Cameron's theme |
| `theme-mts-new` | Mts new (default) |

---

## 16. Sound System Reference

### Architecture

```
playUISound(name)
    ├── Custom audio URL configured?
    │   ├── Yes → Play via HTMLAudioElement from audioCache
    │   └── No  → Fallback to playSynthSound(name)
    ├── Error → Fallback to playSynthSound(name)
    └── preloadUISounds() preloads all configured URLs on startup
```

### Synthesized Sound Details

Uses Web Audio API (`OscillatorNode` + `GainNode`).

Shared AudioContext: `synthAudioContext` (lazily created, auto-resumes if suspended).

Master gain: `synthMasterGain` (set to `appSettings.uiSounds.volume`).

| Sound | Oscillators | Frequency | Duration | Character |
|-------|-------------|-----------|----------|-----------|
| `click` | 1 triangle | 1200→150Hz | 50ms | Quick tactile click |
| `windowOpen` | 4 sine (staggered) | C5→E5→G5→C6 | 200ms each | Ascending arpeggio |
| `windowClose` | 4 sine (staggered) | C6→G5→E5→C5 | 180ms each | Descending arpeggio |
| `error` | 2 sawtooth + lowpass filter | 150/153Hz | 350ms | Harsh buzz |
| `startup` | 6 sine (staggered) | E3→B3→E4→A4→B4→E5 | 2s each | Ascending chord fade-in |

---

*End of documentation. Generated by analysis of all 12 top-level files in `wackyinc/` on 2026-07-29.*
