# A1 – Google Translate Manager (Translate Vault)

A feature-complete Opera/Chrome browser extension for capturing, organizing, and reviewing translations. All data stays on your device — no accounts, no servers.

---

## Features

### Capture
- **Auto-capture** translations directly from `translate.google.com` via content script
- **Manual save** with a one-click toolbar injected into the Google Translate page
- **Keyboard shortcut** Alt+Shift+S to save the current translation
- **Privacy mode** — require confirmation before saving, blur popup content

### Organize
- Unlimited **nested folders** with drag-and-drop hierarchy
- **Starred** translations for quick access
- **Tags** with custom colors for cross-folder categorization
- **Full-text search** with debounced live results
- Smart Collections: Due Review, Never Reviewed, This Week, Most Used, Starred, All, Trash

### Translate
- Built-in translation via multiple providers (no Google Translate page required)
- Providers: **Google Translate (free, no key)**, LibreTranslate, DeepL, Custom HTTP endpoint, Mock
- **GT-style popup** — language selector dropdowns, swap button, source/result panels

### Review (SRS)
- **SM-2 spaced repetition** flashcard review
- Auto-enroll new saves, configurable daily review limit
- **AI review hints** — usage examples fetched from provider when you rate a card "Again"
- Review streak tracking 🔥

### Import / Export
- Export to **JSON** (full backup), **Anki TSV** (flashcard import), **Markdown**
- Import JSON with merge strategies (skip/update duplicates)
- **Batch import** from TSV/CSV

---

## Tech Stack

| Layer | Technology |
|---|---|
| Language | TypeScript ~6.0 (strict + erasableSyntaxOnly) |
| UI | React 19 + Vite 8 |
| Storage | IndexedDB via `idb` v8, `chrome.storage.local` for settings |
| Extension | Manifest V3, Shadow DOM for content script isolation |
| Algorithm | SM-2 spaced repetition |

---

## Build & Install

### Prerequisites
- Node.js 18+
- npm

### Build
```bash
cd translate-vault
npm install
npm run build       # outputs to dist/
npm run typecheck   # must return 0 errors
```

### Load in Browser
1. Open `opera://extensions` (Opera) or `chrome://extensions` (Chrome)
2. Enable **Developer mode**
3. Click **Load unpacked** → select the `dist/` folder

---

## Project Structure

```
translate-vault/
├── public/
│   ├── manifest.json          # Extension manifest (MV3)
│   └── icons/                 # Extension icons
├── src/
│   ├── background/            # Service worker
│   │   ├── index.ts           # Message entry point
│   │   ├── messageRouter.ts   # Routes 49 message types to handlers
│   │   ├── handlers/          # Domain handlers (translation, folder, review, …)
│   │   └── providers/         # Translation provider implementations
│   ├── content/               # Content script (runs on translate.google.com)
│   │   ├── dom/               # Selectors, extractor, MutationObserver
│   │   ├── ui/                # Shadow DOM toolbar
│   │   └── index.ts           # Init, capture modes, keyboard shortcut
│   ├── popup/                 # Extension popup (420×560px)
│   │   ├── App.tsx            # GT-style UI: language bar, source/result panels
│   │   ├── index.css
│   │   └── components/        # SearchBox, TranslationCard, FolderSelect
│   ├── dashboard/             # Full management page (dashboard.html)
│   │   ├── App.tsx            # List / Review / Batch Import / Settings views
│   │   ├── index.css
│   │   └── components/        # TranslationList, Detail, Sidebar, Review, …
│   ├── options/               # Extension options page
│   │   └── App.tsx            # Settings: capture, SRS, privacy, provider
│   └── shared/
│       ├── constants/         # App constants, smart collection definitions
│       ├── db/                # IndexedDB schema, migrations, repositories
│       ├── services/          # dedupeService, srsService, messagingService
│       ├── types/             # All TypeScript interfaces and types
│       └── utils/             # sha256, normalizeText, date, tsv helpers
├── dist/                      # Build output (gitignored)
├── vite.config.ts             # Two-pass build (HTML pages + scripts)
└── PROJECT_ARCHITECTURE.md    # AI working doc — read before touching code
```

---

## Architecture Overview

### Message Passing
Every UI action goes through a typed message bus:
```
Popup / Dashboard / Content Script
  → chrome.runtime.sendMessage({ type, payload })
    → background/messageRouter.ts  (switch on type)
      → handlers/*.ts  (domain logic)
        → repositories  (IndexedDB reads/writes)
```

### Data Model (IndexedDB)
Four object stores: `translations`, `folders`, `tags`, `translation_tags`

Key design decisions:
- **Deduplication** via SHA-256 hash of (normalizedSource + normalizedTranslation + sourceLang + targetLang)
- **Soft delete** with recoverable Trash; hard delete only explicit
- **Folder hierarchy** maintained with `pathCache` for efficient subtree queries
- **SRS fields** co-located on the translation record (no separate review table)

### Translation Providers
All translation goes through `ITranslationProvider`:
```typescript
interface ITranslationProvider {
  translate(text: string, sourceLang: string, targetLang: string): Promise<string>
  getUsageHint?(text: string, sourceLang: string, targetLang: string): Promise<string>
}
```
Default provider: **Google Translate (free)** via `translate.googleapis.com/translate_a/single?client=gtx`. No API key needed.

---

## Development Workflow

### Roles

**Project Manager (user)**
- Defines feature requirements and acceptance criteria
- Evaluates UI/UX and approves/rejects implementations
- Decides version scope and priorities
- Does not write code — communicates intent in natural language

**Developer (AI assistant — Claude Code)**
- Reads `PROJECT_ARCHITECTURE.md` at the start of every session
- Implements features to spec without adding unrequested scope
- Runs `npm run typecheck && npm run build` after every change
- Updates `PROJECT_ARCHITECTURE.md` §12 (completed) and §13 (gaps) each session
- Never breaks the hard constraints in §0 of the architecture doc

### Session Protocol
1. PM describes the feature or change in natural language
2. Developer reads architecture doc, identifies affected files
3. Developer implements, verifies build passes with 0 TS errors
4. Developer reports what changed; PM evaluates
5. PM approves → commit; or PM requests adjustments → repeat

---

## Configuration

Settings are stored in `chrome.storage.local` and editable via the Options page.

| Setting | Default | Description |
|---|---|---|
| `captureMode` | `manual` | manual / auto / off |
| `dedupePolicy` | `update_existing` | What to do when same translation seen again |
| `provider.type` | `google_translate_web` | Active translation provider |
| `srs.enabled` | `true` | Enable spaced repetition |
| `srs.dailyReviewLimit` | `20` | Max cards per day |
| `srs.autoEnrollOnSave` | `false` | Auto-add new saves to review queue |
| `privacyMode.maskPopupContent` | `false` | Blur popup history |

---

## Version History

### v1.0.0 — 2026-05-01
- Full implementation of all core features (Sessions 1–13)
- Added Google Translate (free) as default provider — no API key required
- GT-style popup redesign: language dropdowns with 110 languages, source/result panels, bottom navigation
- Popup source language defaults to "Detect language"
- `'auto'` language code correctly stored as `null` in vault

---

## License

Private — all rights reserved.
