# Translate Vault — v2 Implementation Plan
**AI Handoff Document — Self-Contained Briefing**
Version: 2.0-draft | Base: v1.0.0 | Date: 2026-05-01

---

## HOW TO USE THIS DOCUMENT

This file is your **complete briefing**. Read it top-to-bottom before touching any source file.

1. §1–§9 = project context, architecture, and type reference (read once, refer back as needed)
2. §10 = your task list, divided into 10 sessions
3. §11 = mandatory testing steps after every session
4. §12 = exact prompt template to start each new session

**Also read before implementing:**
`PROJECT_ARCHITECTURE.md` — hard rules, completed session history, constraints that must never be violated.

**Do not read source files** unless you need a specific function signature not covered here. This document replaces that need.

---

## 1. PROJECT IDENTITY

| Field | Value |
|---|---|
| Name | A1 – Google Translate Manager (Translate Vault) |
| Type | Opera/Chrome MV3 browser extension |
| Version | 1.0.0 (v2 work begins from here) |
| Repo | github.com/29kiendev/A1_GoogleTranslate_Manager |
| Branch | main |
| Root | `D:\Work\_Code\opera_plugin\A1_GoogleTranslate_Manager\gemini\translate-vault\` |
| Install | Load unpacked `dist/` in browser |

**Purpose:** Capture translations from Google Translate, save locally in IndexedDB, organize with folders/tags, review with SM-2 spaced repetition. All data local — no cloud.

---

## 2. TECH STACK & BUILD

| Layer | Technology |
|---|---|
| Language | TypeScript ~6.0 (`strict`, `erasableSyntaxOnly`) |
| UI | React 19, Vite 8 |
| Storage | IndexedDB via `idb` v8; settings via `chrome.storage.local` |
| Extension | Manifest V3, Shadow DOM (content script isolation) |
| Algorithm | SM-2 spaced repetition |

### Build Commands
```bash
npm run build       # Two-pass: HTML pages + background/content scripts → dist/
npm run typecheck   # tsc -b — MUST return 0 errors before finishing any session
npm run dev         # Vite dev server (UI only, not extension context)
```

### Two-Pass Build (`vite.config.ts`)
- **Pass 1** (default): Builds `popup.html`, `dashboard.html`, `options.html` + their JS/CSS chunks
- **Pass 2** (`--mode scripts`): Builds `background.js`, `content.js` as flat ES module bundles

**To add a new script** (e.g. `content-fab.js`), edit `vite.config.ts` scripts mode input:
```typescript
// In the scripts mode block:
input: {
  background: resolve(__dirname, 'src/background/index.ts'),
  content:    resolve(__dirname, 'src/content/index.ts'),
  'content-fab': resolve(__dirname, 'src/content-fab/index.ts'),  // ADD THIS
} as Record<string, string>,
```

---

## 3. HARD RULES — NEVER BREAK THESE

1. `npm run typecheck` must return **0 errors** before you finish any session.
2. **No constructor parameter properties** — TypeScript flag `erasableSyntaxOnly` forbids `public readonly x` in constructors. Use explicit class fields.
3. **`boolean` cannot be an IndexedDB index type** in `idb`. Use `number` (0 or 1) instead.
4. **`'auto'` language code** must be stored as `null` in the vault, never as the string `'auto'`. The `sourceLang` field on `Translation` is `string | null`.
5. **Provider abstraction**: Never call translation APIs directly from UI code. Always route through `ITranslationProvider` via background message.
6. **Local-first**: Never add cloud sync or server-side storage. All data stays in IndexedDB / `chrome.storage.local`.
7. **No new MD files** for documenting changes. Update `PROJECT_ARCHITECTURE.md` §12/§13 only.
8. Update `PROJECT_ARCHITECTURE.md` §12 at the end of every session with what was completed.

---

## 4. DIRECTORY MAP

```
translate-vault/
│
├── public/
│   ├── manifest.json              Extension manifest (source of truth for permissions)
│   └── icons/                     16/32/48/128px PNGs
│
├── popup.html                     HTML shell for popup (loads src/popup/main.tsx)
├── dashboard.html                 HTML shell for dashboard
├── options.html                   HTML shell for options page
│
├── src/
│   │
│   ├── background/                SERVICE WORKER (background.js)
│   │   ├── index.ts               Entry: chrome.runtime.onMessage → routeMessage()
│   │   │                          Also handles: OPEN_DASHBOARD (chrome.tabs.create)
│   │   ├── messageRouter.ts       Switch-case routing 40+ message types to handlers
│   │   ├── handlers/
│   │   │   ├── translationHandlers.ts   SAVE, GET, UPDATE, DELETE, RESTORE, SEARCH, RECENT, STAR, MOVE
│   │   │   ├── folderHandlers.ts        GET_TREE, CREATE, UPDATE, DELETE, MOVE, COUNTS
│   │   │   ├── reviewHandlers.ts        GET_DUE_REVIEWS, REVIEW_TRANSLATION, ENROLL_SRS, UNENROLL_SRS
│   │   │   ├── tagHandlers.ts           GET_TAGS, CREATE_TAG, ADD/REMOVE tag on translation
│   │   │   ├── batchHandlers.ts         BATCH_SAVE_TRANSLATIONS
│   │   │   ├── importExportHandlers.ts  EXPORT_DATA (json/anki_tsv/markdown), IMPORT_DATA
│   │   │   ├── settingsHandlers.ts      GET_SETTINGS, UPDATE_SETTINGS
│   │   │   └── providerHandlers.ts      TRANSLATE_TEXT, GET_USAGE_HINT; builds ITranslationProvider
│   │   └── providers/
│   │       ├── googleTranslateWebProvider.ts  DEFAULT — free, no key, gtx client
│   │       ├── mockProvider.ts                Dev/test only
│   │       ├── libreTranslateProvider.ts
│   │       ├── deepLProvider.ts
│   │       └── customHttpProvider.ts
│   │
│   ├── content/                   CONTENT SCRIPT (content.js) — runs on translate.google.com
│   │   ├── index.ts               Init, capture modes (manual/auto/off), Alt+Shift+S shortcut
│   │   ├── dom/
│   │   │   ├── selectors.ts       All CSS selectors for Google Translate DOM (update when GT changes)
│   │   │   ├── extractor.ts       Reads source text, translated text, language codes from DOM
│   │   │   └── observer.ts        MutationObserver, 700ms debounce, caches last payload to skip dupes
│   │   ├── ui/
│   │   │   └── injectToolbar.ts   Shadow DOM toolbar: Save, Copy, Open Dashboard buttons; toast; confirm
│   │   └── state/
│   │       └── contentState.ts    Module-level state: currentPayload, savedCount
│   │
│   ├── content-fab/               FAB CONTENT SCRIPT (content-fab.js) — NEW in v2, runs on <all_urls>
│   │   └── index.ts               TO BE CREATED in Session 1
│   │
│   ├── popup/                     POPUP UI (popup.html, 420×560px)
│   │   ├── main.tsx               React root
│   │   ├── App.tsx                GT-style UI: header, lang bar, source panel, result panel, bottom nav
│   │   ├── index.css              GT-style CSS: .gt-header, .gt-lang-bar, .gt-source-panel, etc.
│   │   └── components/
│   │       ├── SearchBox.tsx      Debounced search input
│   │       ├── TranslationCard.tsx Card with Copy/Star/Move actions
│   │       └── FolderSelect.tsx   Dropdown folder selector
│   │
│   ├── dashboard/                 DASHBOARD (dashboard.html — full-page management UI)
│   │   ├── main.tsx
│   │   ├── App.tsx                Views: list | review | batch_import | settings | translate
│   │   ├── index.css
│   │   └── components/
│   │       ├── TranslationList.tsx      List with multi-select, pagination (50/page)
│   │       ├── TranslationDetail.tsx    Right sidebar detail panel with edit/tags/SRS controls
│   │       ├── SidebarSmartCollections.tsx  7 built-in smart collections with counts
│   │       └── SidebarFolderTree.tsx    Hierarchical folder tree with translation counts
│   │
│   ├── options/                   OPTIONS PAGE
│   │   ├── main.tsx
│   │   ├── App.tsx                Sections: Capture, Duplicates, Privacy, Popup, SRS, Provider, About
│   │   └── index.css
│   │
│   └── shared/
│       ├── constants/
│       │   ├── app.ts             APP_NAME, DB_NAME, DB_VERSION, SETTINGS_KEY
│       │   └── smartCollections.ts  7 SmartCollection definitions
│       ├── db/
│       │   ├── db.ts              getDB() singleton — opens IDBPDatabase<TranslateVaultDB>
│       │   ├── schema.ts          DBSchema with 4 stores (see §7)
│       │   ├── migrations.ts      migrate(db, oldVersion, newVersion)
│       │   └── repositories/
│       │       ├── translationRepository.ts  All translation DB operations
│       │       ├── folderRepository.ts        Folder CRUD, hierarchy, path cache
│       │       ├── tagRepository.ts           Tag CRUD, junction table ops
│       │       └── settingsRepository.ts      getSettings(), saveSettings(), updateSettings()
│       ├── services/
│       │   ├── dedupeService.ts   saveTranslation() — checks dedupeKey, applies policy, auto-enrolls SRS
│       │   ├── srsService.ts      SM-2 algorithm: reviewTranslation(), enrollTranslation(), updateStreak()
│       │   └── messagingService.ts  sendMessage<T>() — Promise wrapper for chrome.runtime.sendMessage
│       ├── types/
│       │   ├── translation.ts     Translation, SearchTranslationsQuery, LangPairCount
│       │   ├── folder.ts          Folder, CreateFolderInput, DeleteFolderMode
│       │   ├── settings.ts        AppSettings, DEFAULT_SETTINGS
│       │   ├── message.ts         MessageType (40+ types), ExtensionMessage, ExtensionResponse
│       │   ├── provider.ts        ProviderType, ITranslationProvider
│       │   ├── tag.ts             Tag, TranslationTag
│       │   ├── review.ts          ReviewRating (1|2|3|4), ReviewSession
│       │   ├── errors.ts          AppError, AppErrorCode (17 codes)
│       │   ├── batchImport.ts     BatchImportInput, BatchImportResult
│       │   ├── importExport.ts    TranslateVaultExport, ImportOptions
│       │   └── smartCollection.ts SmartCollection
│       └── utils/
│           ├── hash.ts            sha256Hex(input) — WebCrypto API
│           ├── normalizeText.ts   normalizeText() — trim, lowercase, collapse whitespace
│           ├── date.ts            startOfWeek(), toISODate(), todayISO(), formatDate()
│           └── assertNever.ts     TypeScript exhaustiveness helper
│
├── dist/                          Build output — gitignored; load this folder as unpacked extension
├── V2_PLAN.md                     THIS FILE
├── PROJECT_ARCHITECTURE.md        AI working doc — update §12/§13 each session
├── README.md                      Human-readable GitHub doc
├── package.json                   v1.0.0, npm scripts
├── vite.config.ts                 Two-pass build config
├── tsconfig.json                  References tsconfig.app.json + tsconfig.node.json
└── .gitignore                     node_modules/, dist/, *.zip, index.html
```

---

## 5. KEY TYPESCRIPT TYPES

### Translation (main entity)
```typescript
// src/shared/types/translation.ts
export interface Translation {
  id: string                        // nanoid
  sourceText: string
  translatedText: string
  sourceLang: string | null         // null = "detect language" / unknown
  targetLang: string | null
  sourceLangLabel?: string | null   // Human name e.g. "English"
  targetLangLabel?: string | null   // Human name e.g. "Vietnamese"
  provider: 'google_translate'      // fixed string for now
  folderId: string | null
  isStarred: boolean
  isArchived: boolean
  isDeleted: boolean                // soft-delete (trash)
  note: string | null
  usageCount: number                // incremented on dedupe
  sourceHash: string
  translationHash: string
  dedupeKey: string                 // sha256 of normalized(source+translated+langs)
  createdAt: number                 // epoch ms
  updatedAt: number
  lastUsedAt: number
  capturedFromUrl: string
  captureMode: 'auto' | 'manual' | 'import' | 'batch_import'
  srsEnabled: boolean
  srsInterval: number               // days until next review
  srsEaseFactor: number             // SM-2 ease, default 2.5
  srsRepetitions: number
  nextReviewAt: number | null       // epoch ms
  lastReviewedAt: number | null
  metadata?: {
    pageTitle?: string
    detectedSourceLang?: string | null
    rawSourceLang?: string | null
    rawTargetLang?: string | null
    sourceUrl?: string | null
  }
}
```

### AppSettings (current v1)
```typescript
// src/shared/types/settings.ts
export interface AppSettings {
  schemaVersion: number
  captureMode: 'manual' | 'auto' | 'off'
  defaultFolderId: string | null
  dedupePolicy: 'update_existing' | 'create_new' | 'ask'
  popupDefaultView: 'recent' | 'search' | 'folders' | 'translate'
  searchDebounceMs: number          // default 300
  maxRecentItems: number            // default 20
  showInjectedButtons: boolean      // show toolbar on GT page
  enableKeyboardShortcuts: boolean  // Alt+Shift+S
  srs: {
    enabled: boolean
    autoEnrollOnSave: boolean
    dailyReviewLimit: number        // default 20
  }
  reviewStreak: {
    currentDays: number
    lastReviewDate: string | null
    longestDays: number
  }
  privacyMode: {
    requireConfirmationBeforeSaving: boolean
    maskPopupContent: boolean
  }
  provider: {
    type: 'google_translate_web' | 'mock' | 'custom_http' | 'google_cloud' | 'deepl' | 'libre_translate'
    apiKey: string
    endpoint: string
  }
}
```

### Messages
```typescript
// src/shared/types/message.ts
export type MessageType =
  | 'TRANSLATION_DETECTED' | 'SAVE_TRANSLATION' | 'BATCH_SAVE_TRANSLATIONS'
  | 'SEARCH_TRANSLATIONS' | 'GET_RECENT_TRANSLATIONS' | 'GET_TRANSLATION'
  | 'UPDATE_TRANSLATION' | 'DELETE_TRANSLATION' | 'RESTORE_TRANSLATION'
  | 'PERMANENT_DELETE_TRANSLATION' | 'EMPTY_TRASH' | 'STAR_TRANSLATION'
  | 'ENROLL_SRS' | 'UNENROLL_SRS'
  | 'CREATE_FOLDER' | 'UPDATE_FOLDER' | 'DELETE_FOLDER' | 'MOVE_FOLDER'
  | 'MOVE_TRANSLATION' | 'GET_FOLDER_TREE' | 'GET_FOLDER_COUNTS'
  | 'GET_DUE_REVIEWS' | 'REVIEW_TRANSLATION'
  | 'EXPORT_DATA' | 'IMPORT_DATA'
  | 'GET_SETTINGS' | 'UPDATE_SETTINGS'
  | 'GET_LANG_PAIRS' | 'GET_DUE_COUNT' | 'OPEN_DASHBOARD'
  | 'GET_TAGS' | 'GET_TAGS_FOR_TRANSLATION' | 'CREATE_TAG'
  | 'ADD_TAG_TO_TRANSLATION' | 'REMOVE_TAG_FROM_TRANSLATION'
  | 'TRANSLATE_TEXT' | 'GET_USAGE_HINT' | 'GET_SMART_COLLECTION_COUNTS'

export interface ExtensionMessage<TPayload = unknown> {
  type: MessageType
  payload?: TPayload
  requestId?: string
}

export interface ExtensionResponse<TData = unknown> {
  ok: boolean
  data?: TData
  error?: { code: AppErrorCode; message: string; details?: unknown }
}
```

### Provider
```typescript
// src/shared/types/provider.ts
export type ProviderType = 'google_translate_web' | 'mock' | 'custom_http' | 'google_cloud' | 'deepl' | 'libre_translate'

export interface ITranslationProvider {
  translate(text: string, sourceLang: string, targetLang: string): Promise<string>
  getUsageHint?(text: string, sourceLang: string, targetLang: string): Promise<string>
}

export interface ProviderConfig {
  type: ProviderType
  apiKey: string
  endpoint: string
}
```

---

## 6. MESSAGE ROUTING REFERENCE

**File:** `src/background/messageRouter.ts`

All messages arrive in `background/index.ts` → `routeMessage(message, sender)` → handler functions.

`OPEN_DASHBOARD` is handled **directly** in `background/index.ts` (not via router) using `chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') })`.

**Adding a new message type:**
1. Add to `MessageType` union in `src/shared/types/message.ts`
2. Add payload type if needed
3. Add case in `src/background/messageRouter.ts`
4. Implement handler in appropriate `src/background/handlers/*.ts` file

---

## 7. DATABASE SCHEMA

**DB name:** `translate-vault` | **Version:** 1

| Store | Key | Unique indexes | Non-unique indexes |
|---|---|---|---|
| `translations` | `id` (string) | `dedupeKey` | `folderId`, `isDeleted`(num), `isStarred`(num), `createdAt`, `lastUsedAt`, `usageCount`, `nextReviewAt`, `srsEnabled`(num), `sourceLang`, `targetLang` |
| `folders` | `id` (string) | — | `parentId`, `isDeleted`(num) |
| `tags` | `id` (string) | `slug` | — |
| `translation_tags` | `id` (string) | `pair`([translationId,tagId]) | `translationId`, `tagId` |

**Note:** IndexedDB cannot index `boolean`. Fields `isDeleted`, `isStarred`, `srsEnabled` are stored as `boolean` in TypeScript but queried as `0`/`1` in IDB operations.

---

## 8. SETTINGS SCHEMA — CURRENT + v2 ADDITIONS

### Current DEFAULT_SETTINGS (v1.0.0)
```typescript
{
  schemaVersion: 1,
  captureMode: 'manual',
  defaultFolderId: null,
  dedupePolicy: 'update_existing',
  popupDefaultView: 'recent',
  searchDebounceMs: 300,
  maxRecentItems: 20,
  showInjectedButtons: true,
  enableKeyboardShortcuts: false,
  srs: { enabled: true, autoEnrollOnSave: false, dailyReviewLimit: 20 },
  reviewStreak: { currentDays: 0, lastReviewDate: null, longestDays: 0 },
  privacyMode: { requireConfirmationBeforeSaving: false, maskPopupContent: false },
  provider: { type: 'google_translate_web', apiKey: '', endpoint: '' },
}
```

### New settings fields to add in v2 (add to AppSettings interface + DEFAULT_SETTINGS):

**Session 1 — FAB:**
```typescript
fab: {
  enabled: boolean          // default false — requires <all_urls> optional permission
  autoHide: boolean         // default true — hides after mouse leaves
  position: {
    side: 'right' | 'left'  // default 'right'
    offsetX: number         // default 16 (px from edge)
    offsetY: number         // default 80 (% from top, 0-100)
  }
  globalPosition: boolean   // default true — same position on all pages; false = per-domain
}
```

**Session 3 — UI preferences:**
```typescript
uiPreferences: {
  translateFontScale: number   // default 1.0 — CSS scale factor (0.75 to 2.0)
  recentLanguagePairs: Array<{ sourceLang: string; targetLang: string }>  // default []
}
```

---

## 9. v1.0.0 STATE — WHAT IS ALREADY BUILT

Every feature below is **complete and working**. Do not re-implement.

| Category | What's built |
|---|---|
| **Capture** | Content script on translate.google.com; manual/auto/off modes; Shadow DOM toolbar; Alt+Shift+S shortcut; confirmation mode; privacy mask |
| **Storage** | IndexedDB with 4 stores; deduplication (SHA-256 + policy); soft-delete/trash/restore/hard-delete |
| **Folders** | Unlimited nesting; pathCache; create/rename/move/delete (3 modes); counts |
| **Tags** | Create with color; attach/remove; display in list |
| **Search** | Full-text search; filter by folder/star/lang/tag/date; sorting; pagination |
| **SRS** | SM-2 algorithm; auto-enroll; daily limit; streak tracking; AI usage hints |
| **Import/Export** | JSON full backup; Anki TSV; Markdown; batch import; import with merge |
| **Smart Collections** | Due Review, Never Reviewed, This Week, Most Used, Starred, All, Trash (with counts) |
| **Dashboard** | List + multi-select + bulk ops; detail sidebar; review view; batch import; translate view; settings view |
| **Popup** | GT-style UI: language selects (110 langs), swap, auto-detect, source/result panels, bottom nav (translate/history/review), keyboard nav in history |
| **Options** | All settings; Translation Provider with conditional endpoint/key fields |
| **Providers** | GoogleTranslateWeb (default, free), LibreTranslate, DeepL, CustomHTTP, Mock |

---

## 10. v2 SESSION PLAN

> Sessions are ordered: user-requested features first, then developer suggestions.
> Each session ends with a mandatory build check (§11).

---

### SESSION 1 — FAB Foundation + Pin Popup
**User requests: req-2 (FAB), req-1 (pin), req-5 (tab defaults)**
**Estimated complexity:** High (new content script, manifest change, optional permission)

#### Background: FAB Design Decision
- **Button style:** Direct DOM injection (IIFE, inline styles, no Shadow DOM for the button itself) — same technique as `D:\Work\_Code\opera_plugin\A1_Tab_Master\content.js`. Reference that file for: zoom-aware wrapper (`zoom: 1/currentZoom`), glass effect (`backdrop-filter: blur`), `z-index: 2147483647`, draggable.
- **Panel behavior:** FAB click → `chrome.runtime.sendMessage({ type: 'OPEN_FAB_POPUP' })` → background calls `chrome.windows.create({ url: chrome.runtime.getURL('popup.html') + '?source=fab', type: 'popup', width: 420, height: 560 })`.
- **Permission strategy:** `<all_urls>` as **optional permission**. User opts in from Options page. Content script injected programmatically after permission granted via `chrome.scripting.executeScript`.

#### Files to create:
- `src/content-fab/index.ts` — IIFE-wrapped FAB content script

#### Files to modify:
| File | Change |
|---|---|
| `public/manifest.json` | Add `"optional_permissions": ["<all_urls>"]` and `"optional_host_permissions": ["<all_urls>"]`; add `"scripting"` to `permissions` |
| `src/shared/types/settings.ts` | Add `fab` block to `AppSettings` interface and `DEFAULT_SETTINGS` |
| `src/shared/types/message.ts` | Add `'OPEN_FAB_POPUP'` to `MessageType` union |
| `src/background/index.ts` | Handle `OPEN_FAB_POPUP` directly (like `OPEN_DASHBOARD`) |
| `src/options/App.tsx` | Add "FAB" section: enable toggle (with `chrome.permissions.request()`), auto-hide toggle, position preference |
| `src/options/index.css` | Styles for new FAB section |
| `src/popup/App.tsx` | Detect `?source=fab` URL param → set initial tab to `'translate'` |
| `vite.config.ts` | Add `'content-fab': resolve(__dirname, 'src/content-fab/index.ts')` to scripts mode input |

#### `src/content-fab/index.ts` implementation spec:
```
;(function () {
  // 1. Load settings — check fab.enabled, else return early
  // 2. Create FAB wrapper div (fixed position, z-index max)
  //    - Apply zoom correction: zoom: 1 / window.devicePixelRatio (or read from page)
  //    - Position from settings: fab.position.side + fab.position.offsetX/Y
  // 3. FAB button: 52px circle, glass effect (backdrop-filter: blur(10px),
  //    background: rgba(26,115,232,0.9)), white "T" text or translate SVG icon
  // 4. Auto-hide: if fab.autoHide=true, fade to opacity:0.3 after 3s,
  //    restore to opacity:1 on mouseenter, fade again on mouseleave
  // 5. Click handler: chrome.runtime.sendMessage({ type: 'OPEN_FAB_POPUP' })
  // 6. Draggable: mousedown → track mousemove → update position → save to storage
  //    - If globalPosition=true: save to chrome.storage.local key 'fabPosition'
  //    - If false: save to key 'fabPosition_<hostname>'
  // 7. Listen for storage changes to update if settings change in Options
  // 8. Listen for message 'FAB_UPDATE_SETTINGS' to rebuild if needed
})()
```

#### `background/index.ts` addition:
```typescript
// Alongside the OPEN_DASHBOARD handler:
if (message.type === 'OPEN_FAB_POPUP') {
  chrome.windows.create({
    url: chrome.runtime.getURL('popup.html') + '?source=fab',
    type: 'popup',
    width: 420,
    height: 560,
  })
  return false
}
```

#### Pin popup (in `src/popup/App.tsx`):
Add a pin icon (📌) to the right of "Vault" in `.gt-header-right`. On click:
```typescript
const handlePin = () => {
  chrome.windows.create({
    url: chrome.runtime.getURL('popup.html') + '?source=pinned',
    type: 'popup',
    width: 420,
    height: 560,
  })
  window.close()
}
```
Add CSS class `.gt-pin-btn` styled similar to `.gt-vault-btn`.

#### Tab default logic (in `src/popup/App.tsx`):
```typescript
// In initial useEffect, before reading settings:
const urlParams = new URLSearchParams(window.location.search)
const source = urlParams.get('source')  // 'fab' | 'pinned' | null
if (source === 'fab') {
  setTab('translate')
} else {
  // read from settings as before
}
```

#### Session 1 Tests:
- [ ] FAB does NOT appear by default (fab.enabled = false)
- [ ] Enabling FAB in Options triggers permission request dialog
- [ ] After permission granted, FAB appears on a test webpage
- [ ] FAB auto-hides when mouse leaves (if autoHide=true)
- [ ] FAB remains visible when autoHide=false
- [ ] Clicking FAB opens a 420×560 popup window defaulting to Translate tab
- [ ] Clicking the pin button in popup opens a new window and closes the popup
- [ ] `npm run typecheck` → 0 errors
- [ ] `npm run build` → succeeds

---

### SESSION 2 — FAB UX Polish
**User request: req-2 (FAB dragging, zoom, glass, position persistence)**
**Estimated complexity:** Medium

#### Files to modify:
| File | Change |
|---|---|
| `src/content-fab/index.ts` | Add dragging, zoom-awareness, glass effects, per-domain position |
| `src/options/App.tsx` | Add: FAB position side (left/right), global vs per-domain toggle |

#### Draggable implementation spec (in content-fab):
```
- mousedown on FAB: enter drag mode, record offset from cursor to button center
- mousemove on document: update wrapper position (clamp to viewport bounds)
- mouseup: exit drag mode, save position to storage
- Threshold: only enter drag mode if mouse moves > 5px (to distinguish click from drag)
- Zoom correction: all coordinate calculations divide by zoom factor
```

#### Glass effect CSS (inline, injected by content-fab):
```css
background: rgba(26, 115, 232, 0.88);
backdrop-filter: blur(12px);
-webkit-backdrop-filter: blur(12px);
border: 1px solid rgba(255,255,255,0.3);
box-shadow: 0 4px 24px rgba(0,0,0,0.18);
border-radius: 50%;
transition: opacity 0.3s ease, transform 0.2s ease;
```

#### Session 2 Tests:
- [ ] FAB can be dragged to any corner
- [ ] Position persists after page reload
- [ ] Position is per-domain when globalPosition=false
- [ ] FAB position is correct when browser zoom is 75%, 100%, 125%, 150%
- [ ] Glass effect renders correctly on dark and light page backgrounds
- [ ] `npm run typecheck && npm run build` → 0 errors

---

### SESSION 3 — Auto-translate on Paste + Action Buttons + Zoom
**User requests: req-3 (action buttons + zoom), req-4 (auto-translate, remove button)**
**Estimated complexity:** Medium

#### Files to modify:
| File | Change |
|---|---|
| `src/popup/App.tsx` | Remove Translate button; add onPaste; add action buttons; add zoom controls |
| `src/popup/index.css` | Styles for new buttons, zoom controls |
| `src/shared/types/settings.ts` | Add `uiPreferences.translateFontScale` and `uiPreferences.recentLanguagePairs` |
| `src/options/App.tsx` | Expose `translateFontScale` setting (optional, can also be per-session) |

#### Auto-translate on paste:
```typescript
// In popup/App.tsx, add to the textarea:
onPaste={e => {
  const pasted = e.clipboardData.getData('text')
  if (pasted.trim()) {
    setSourceText(pasted)
    setTranslateResult(null)
    // Trigger after React re-render:
    setTimeout(() => handleTranslate(), 300)
  }
}}
```
Remove the `<button className="gt-translate-btn">` from the source footer entirely.

#### Re-translate icon (↻):
Replace the translate button with a small circular icon button that appears only when `sourceText` is non-empty AND `translateResult` is not null (meaning user edited after translating):
```typescript
{sourceText && translateResult && (
  <button className="gt-retranslate-btn" onClick={handleTranslate} title="Re-translate">↻</button>
)}
```

#### Action buttons in result panel:
Add to `.gt-result-footer` (after copy and star icons that already exist):
1. **Open in GT** — `<a>` opening `https://translate.google.com/?sl=${sourceLang === 'auto' ? 'auto' : sourceLang}&tl=${targetLang}&text=${encodeURIComponent(sourceText)}` in new tab
2. **Save to folder** — `<select>` (FolderSelect component) that on change calls `sendMessage({ type: 'MOVE_TRANSLATION', payload: { id: translateResult.id, folderId } })`

Existing **Copy** icon and **Star** icon stay as they are.

#### Zoom controls:
Add `+` / `−` buttons to the source footer (alongside the clear button):
```typescript
const [fontScale, setFontScale] = useState(settings?.uiPreferences?.translateFontScale ?? 1.0)

const adjustFont = (delta: number) => {
  const next = Math.min(2.0, Math.max(0.75, fontScale + delta))
  setFontScale(next)
  update({ uiPreferences: { ...settings.uiPreferences, translateFontScale: next } })
}
```
Apply scale via inline style: `style={{ fontSize: `${fontScale * 18}px` }}` on textarea and `style={{ fontSize: `${fontScale * 22}px` }}` on result text.

#### Session 3 Tests:
- [ ] Pasting text into the textarea triggers automatic translation
- [ ] No "Translate" button visible
- [ ] ↻ re-translate icon appears when text is edited after a result exists
- [ ] Font size +/- changes the text size in both panels
- [ ] Font scale persists after closing and reopening popup
- [ ] "Open in GT" opens correct Google Translate URL
- [ ] "Save to folder" dropdown shows folders; selecting one updates the translation's folder
- [ ] `npm run typecheck && npm run build` → 0 errors

---

### SESSION 4 — Popup History Folder Tree
**User request: req-7**
**Estimated complexity:** Medium

#### Files to modify:
| File | Change |
|---|---|
| `src/popup/App.tsx` | Add tree/list view toggle to history tab; load folder-grouped data |
| `src/popup/index.css` | Styles for tree view: `.history-tree`, `.tree-folder`, `.tree-item` |

#### Tree view implementation:
Add state: `const [historyView, setHistoryView] = useState<'list' | 'tree'>('list')`

For tree view, load ALL translations (up to 200) and ALL folders in one shot, then group client-side:
```typescript
const loadTreeData = async () => {
  const [translationsRes, foldersRes] = await Promise.all([
    sendMessage<{ items: Translation[]; total: number }>({
      type: 'SEARCH_TRANSLATIONS',
      payload: { limit: 200, sortBy: 'lastUsedAt', sortDirection: 'desc' }
    }),
    sendMessage<Folder[]>({ type: 'GET_FOLDER_TREE' })
  ])
  // Group translations by folderId
  // Build tree: folders as nodes, translations as leaves
  // "Unsorted" node for folderId === null
}
```

Tree structure:
```
📁 Japanese vocab (12)          ← folder node, collapsible
  └ こんにちは → Hello          ← translation card (compact: source | translated)
  └ ありがとう → Thank you
📁 Work phrases (5)
  └ ...
📄 Unsorted (8)                  ← virtual node for null folderId
  └ ...
```

Compact translation row in tree mode (not full TranslationCard):
- Single line: `[source text] → [translated text]`
- Right: copy icon + star icon
- Click → copy translation (same as Enter in list mode)

Add toggle button in history tab controls: `[≡ List] [🌲 Tree]` — small icon buttons.

#### Session 4 Tests:
- [ ] Toggle between list and tree view works
- [ ] Tree shows correct folder hierarchy
- [ ] Translations appear under correct folder nodes
- [ ] Unsorted node contains translations with no folder
- [ ] Folder nodes collapse/expand on click
- [ ] Copy works from tree view
- [ ] List view still works exactly as before
- [ ] `npm run typecheck && npm run build` → 0 errors

---

### SESSION 5 — Dashboard Detail Panel UX
**User request: req-8**
**Estimated complexity:** Low-Medium

#### Files to modify:
| File | Change |
|---|---|
| `src/dashboard/components/TranslationDetail.tsx` | Add expand button; implement modal overlay |
| `src/dashboard/index.css` | Add `.detail-modal-overlay`, `.detail-modal`, `.detail-modal-header` |

#### Expand button:
In the TranslationDetail header bar, add:
```tsx
<button className="detail-expand-btn" onClick={() => setExpanded(true)} title="Expand view">⤢</button>
```
Add state: `const [expanded, setExpanded] = useState(false)`

#### Modal overlay:
When `expanded === true`, render a portal (or absolute positioned overlay):
```tsx
{expanded && (
  <div className="detail-modal-overlay" onClick={() => setExpanded(false)}>
    <div className="detail-modal" onClick={e => e.stopPropagation()}>
      <div className="detail-modal-header">
        <span>{item.sourceText.substring(0, 40)}…</span>
        <button onClick={() => setExpanded(false)}>✕</button>
      </div>
      {/* Full TranslationDetail content here */}
    </div>
  </div>
)}
```

Modal CSS:
```css
.detail-modal-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,.45);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000;
}
.detail-modal {
  background: #fff;
  border-radius: 12px;
  width: 80vw; max-width: 900px;
  max-height: 85vh; overflow-y: auto;
  padding: 24px;
  box-shadow: 0 8px 40px rgba(0,0,0,.25);
}
```

Also add `Escape` key listener to close: `useEffect(() => { if (expanded) { const h = (e) => { if (e.key === 'Escape') setExpanded(false) }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h) } }, [expanded])`

#### Session 5 Tests:
- [ ] Expand button (⤢) appears in detail panel header
- [ ] Clicking it opens a centered modal with full content
- [ ] Long translations are fully readable in the modal
- [ ] All edit controls work inside the modal (note, folder, tags, star, delete)
- [ ] Escape key closes the modal
- [ ] Clicking outside the modal closes it
- [ ] Sidebar panel still works as before when not expanded
- [ ] `npm run typecheck && npm run build` → 0 errors

---

### SESSION 6 — Quick Language Pins + Copy Shortcut + Open in GT
**v2 suggestions: #2 (language pins), #3 (copy shortcut), #4 (open in GT)**
**Estimated complexity:** Low

#### Files to modify:
| File | Change |
|---|---|
| `src/popup/App.tsx` | Add quick-pick chips; Ctrl+C shortcut; Open in GT button |
| `src/popup/index.css` | Styles for `.gt-lang-pins`, `.gt-lang-pin-chip` |
| `src/shared/types/settings.ts` | `uiPreferences.recentLanguagePairs` already added in Session 3 |

#### Quick language pins:
After every successful translation, update settings:
```typescript
const updateRecentPairs = (sl: string, tl: string) => {
  const current = settings.uiPreferences?.recentLanguagePairs ?? []
  const next = [{ sourceLang: sl, targetLang: tl }, ...current.filter(p => !(p.sourceLang === sl && p.targetLang === tl))].slice(0, 3)
  update({ uiPreferences: { ...settings.uiPreferences, recentLanguagePairs: next } })
}
```
Render above the language bar:
```tsx
{recentPairs.length > 0 && (
  <div className="gt-lang-pins">
    {recentPairs.map(p => (
      <button key={`${p.sourceLang}-${p.targetLang}`} className="gt-lang-pin-chip"
        onClick={() => { setSourceLang(p.sourceLang); setTargetLang(p.targetLang) }}>
        {langName(p.sourceLang)} → {langName(p.targetLang)}
      </button>
    ))}
  </div>
)}
```

#### Ctrl+C shortcut:
In the translate tab `useEffect`, add:
```typescript
const handleKeyDown = (e: KeyboardEvent) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'c' && translateResult && document.getSelection()?.toString() === '') {
    e.preventDefault()
    copyText(translateResult.translatedText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
}
```

#### Open in GT button (already specified in Session 3, just verifying it's here):
Should already be implemented in Session 3. Verify it's present.

#### Session 6 Tests:
- [ ] After a translation, the language pair chip appears above the lang bar
- [ ] Clicking a chip sets both language selects
- [ ] Only last 3 unique pairs shown
- [ ] Ctrl+C on translate tab copies result when no text is selected
- [ ] Open in GT button opens correct URL
- [ ] `npm run typecheck && npm run build` → 0 errors

---

### SESSION 7 — Folder Selector in Result + Provider Health Check
**v2 suggestions: #1 (folder selector), #9 (health check)**
**Estimated complexity:** Low

> Note: Folder selector in result panel was already added in Session 3. In this session, verify it is working and polish if needed.

#### Files to modify:
| File | Change |
|---|---|
| `src/options/App.tsx` | Add "Test Provider" button in Translation Provider section |
| `src/options/index.css` | Styles for test result display |
| `src/shared/types/message.ts` | Add `'TEST_PROVIDER'` to MessageType |
| `src/background/handlers/providerHandlers.ts` | Add `handleTestProvider()` |
| `src/background/messageRouter.ts` | Route `TEST_PROVIDER` |

#### Provider health check:
```typescript
// In providerHandlers.ts:
export async function handleTestProvider(): Promise<ExtensionResponse> {
  const start = Date.now()
  try {
    const settings = await getSettings()
    const provider = buildProvider(settings.provider)
    const result = await provider.translate('Hello', 'en', 'es')
    const latency = Date.now() - start
    return { ok: true, data: { result, latencyMs: latency } }
  } catch (e) {
    return { ok: false, error: { code: 'UNKNOWN_ERROR', message: String(e) } }
  }
}
```

In Options UI:
```tsx
<button onClick={handleTest} disabled={testing}>
  {testing ? 'Testing…' : 'Test Provider'}
</button>
{testResult && <div className="provider-test-result">
  {testResult.ok ? `✓ "${testResult.data.result}" (${testResult.data.latencyMs}ms)` : `✗ ${testResult.error?.message}`}
</div>}
```

#### Session 7 Tests:
- [ ] "Test Provider" button calls the active provider with "Hello" → "es"
- [ ] Shows translated result + latency in ms
- [ ] Shows error message if provider fails (e.g., invalid API key)
- [ ] Folder selector in translate result panel assigns translation to folder
- [ ] `npm run typecheck && npm run build` → 0 errors

---

### SESSION 8 — Statistics Dashboard
**v2 suggestion: #10**
**Estimated complexity:** Medium-High

#### Files to modify:
| File | Change |
|---|---|
| `src/dashboard/App.tsx` | Add `'stats'` to `View` type; add "Stats" button in sidebar/topbar |
| `src/dashboard/index.css` | Styles for stats view |

#### Stats view (inline in dashboard App.tsx):
Three sections using pure CSS/SVG charts (no external chart library):

1. **Saves per week (last 8 weeks)** — bar chart:
   Query: `SEARCH_TRANSLATIONS` with `createdFrom: 8weeksAgo, sortBy: 'createdAt'`, then bucket by ISO week.

2. **Language pair distribution** — horizontal bar chart:
   Use existing `GET_LANG_PAIRS` message → shows top 10 pairs.

3. **SRS retention rate** — single metric:
   `GET_DUE_REVIEWS` count vs total enrolled (from `SEARCH_TRANSLATIONS` with `srsEnabled: true`). Calculate: `retained = enrolled - due` / `enrolled * 100`.

All rendered as simple CSS `<div>` bars with widths set as `style={{ width: `${pct}%` }}`.

#### Session 8 Tests:
- [ ] Stats view accessible from dashboard
- [ ] "Saves per week" chart shows correct data
- [ ] Language pairs chart shows correct top pairs
- [ ] SRS retention % is reasonable (not 0% or 100% unless data confirms it)
- [ ] Works with empty vault (no errors, shows "No data yet")
- [ ] `npm run typecheck && npm run build` → 0 errors

---

### SESSION 9 — Mobile-Friendly Popup + Phrasebook Mode
**v2 suggestions: #8 (mobile), #6 (phrasebook)**
**Estimated complexity:** High

#### Mobile-friendly popup:
Change `body` from fixed `width: 420px; height: 560px` to responsive:
```css
body {
  width: 100%;
  max-width: 420px;
  min-height: 480px;
  height: 100vh;
  max-height: 560px;
}
```
Test at 320px, 375px (iPhone SE), 420px widths.

#### Phrasebook mode:
This is a new feature — decide if phrasebooks are a new DB store or a special folder type.

**Recommendation:** Use a new `phrasebooks` IndexedDB store rather than polluting folders. This keeps the folder tree clean.

Steps:
1. Add `phrasebooks` store to `schema.ts` (with migration to DB version 2)
2. Add `phrasebook_items` junction store (phrasebookId + translationId + order)
3. Add `migrations.ts` v1→v2 migration creating the new stores
4. Add types: `Phrasebook`, `PhrasebookItem` in `src/shared/types/phrasebook.ts`
5. Add message types: `CREATE_PHRASEBOOK`, `GET_PHRASEBOOKS`, `ADD_TO_PHRASEBOOK`, `REMOVE_FROM_PHRASEBOOK`, `REORDER_PHRASEBOOK`
6. Add handlers, repository
7. UI: "Phrasebook" view in dashboard; "Add to Phrasebook" in TranslationDetail

#### Session 9 Tests:
- [ ] Popup renders correctly at 320px width (no horizontal scrolling)
- [ ] Phrasebook create/rename/delete works
- [ ] Adding translation to phrasebook works from TranslationDetail
- [ ] Reordering items in phrasebook works
- [ ] `npm run typecheck && npm run build` → 0 errors

---

### SESSION 10 — Context Capture + Scheduled Export + Polish
**v2 suggestions: #7 (context), #5 (export), plus any polish from previous sessions**
**Estimated complexity:** Medium

#### Context capture:
Add optional `context?: string` field to `Translation` type (already has optional `metadata`; add to that):
```typescript
metadata?: {
  // ... existing fields ...
  context?: string | null   // Surrounding sentence from capture page
}
```

In `src/content/dom/extractor.ts`, after extracting source text, try to read the surrounding paragraph or sentence from the GT page. Save as `metadata.context`.

Show context in TranslationDetail under the source text, labeled "Context:".

#### Scheduled/manual export:
Add "Download JSON backup" button in Options > About section:
```typescript
const handleExport = async () => {
  const res = await sendMessage<TranslateVaultExport>({ type: 'EXPORT_DATA', payload: { format: 'json' } })
  if (res?.ok && res.data) {
    const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `translate-vault-backup-${new Date().toISOString().slice(0,10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }
}
```

#### Session 10 Tests:
- [ ] Context field appears in TranslationDetail for captures from GT page
- [ ] "Download JSON backup" downloads a valid JSON file
- [ ] Imported backup restores all data
- [ ] `npm run typecheck && npm run build` → 0 errors

---

## 11. TESTING PROTOCOL

**After EVERY session, run in order:**

```bash
cd "D:\Work\_Code\opera_plugin\A1_GoogleTranslate_Manager\gemini\translate-vault"
npm run typecheck
```
→ Must exit with **0 errors**. Fix all errors before reporting completion.

```bash
npm run build
```
→ Must show `✓ built` for both passes with no warnings about missing exports or unresolved imports.

**Manual extension test:**
1. Open Opera/Chrome → Extensions → Load unpacked → select `dist/`
2. Click the extension icon → popup opens
3. Check browser console (background page) for runtime errors
4. Test the specific features implemented in the session (use the per-session checklist above)

**Regression check (run after every session):**
- Popup translate tab: paste text → auto-translate fires
- Popup history tab: list loads, search works
- Dashboard: list loads, detail panel opens for selected item
- Options: save a setting → reload extension → verify setting persisted

---

## 12. SESSION START COMMAND

Copy-paste this prompt at the start of each new AI session, replacing `[N]` with the session number:

---

```
You are a TypeScript/React developer working on the A1 Google Translate Manager browser extension (Translate Vault).

Read these two files completely before touching any code:

1. D:\Work\_Code\opera_plugin\A1_GoogleTranslate_Manager\gemini\translate-vault\V2_PLAN.md
   → Your complete briefing: architecture reference, type definitions, and session task list

2. D:\Work\_Code\opera_plugin\A1_GoogleTranslate_Manager\gemini\translate-vault\PROJECT_ARCHITECTURE.md
   → Hard rules, completed session history, constraints that must never be broken

Your task: Execute SESSION [N] as described in V2_PLAN.md §SESSION [N].

After every file change, verify the build stays clean:
  cd "D:\Work\_Code\opera_plugin\A1_GoogleTranslate_Manager\gemini\translate-vault"
  npm run typecheck && npm run build
Both must exit with 0 errors.

When SESSION [N] is complete:
1. Run the session's test checklist from V2_PLAN.md §SESSION [N] — Tests
2. Update PROJECT_ARCHITECTURE.md §12 with "Session 1[N]: [one-line description]"
3. Update PROJECT_ARCHITECTURE.md §13 if you found new gaps
4. Report: files changed, what was implemented, any deviations from the plan and why

Hard rules (from PROJECT_ARCHITECTURE.md §3 and V2_PLAN.md §3):
- TypeScript strict mode + erasableSyntaxOnly: no constructor parameter properties
- boolean cannot be used as an IndexedDB index: use 0/1
- 'auto' sourceLang stored as null in DB
- Never call translation APIs from UI code — always through background message bus
- No new .md files — update existing docs only
```

---

**Reference project for FAB technique:**
`D:\Work\_Code\opera_plugin\A1_Tab_Master\content.js`
Read lines 1–200 for: IIFE wrapper, zoom correction, glass effect CSS, drag logic.
Apply that button technique in `src/content-fab/index.ts`.

---

*End of V2_PLAN.md*
