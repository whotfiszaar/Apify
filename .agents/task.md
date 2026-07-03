# Restman Full Audit Fix — Task Tracker

## Phase 1: Foundation & Utilities
- `[x]` **index.css** — Fix render-blocking fonts, duplicate vars, missing animations, Firefox scrollbars, z-index system
- `[x]` **main.tsx** — Add error boundary, keep StrictMode
- `[x]` **db.ts** — Fix seed data (remove duplicate query params, use ${} syntax), add history cleanup, fix Variable.id collision, add collection-level variables schema
- `[x]` **urlHelper.ts** — Change resolveVariables to ${} syntax, fix buildUrlWithParams edge cases, fix detectSmartRequestType
- `[x]` **responseInspector.ts** — Fix circular ref protection, duplicate percentage formula, date detection, ID field filtering
- `[x]` **postmanImporter.ts** — Fix ID collisions, add transaction wrapping, fix validation, replace .substr()
- `[x]` **postmanExporter.ts** — Fix folderId undefined check, add type safety

## Phase 2: Core App
- `[x]` **App.tsx** — Fix setProxyOpen crash, response height drag broken, DB writes on mousemove, per-tab response state, variable merging, btoa unicode, error status 500, history ID collisions, stale closures, isInitialized render guard, debounce

## Phase 3: Major Components  
- `[x]` **VariablesModal.tsx** — Fix invisible delete button, duplicate key prevention, escape/backdrop close, debounce writes, smart ${} UI, collection-level scope, env form state reset, search reset
- `[x]` **RequestWorkspace.tsx** — Fix URL change debounce, tab sync, context menu overflow, header suggestions constant, getResolvedUrlPreview memoize, method colors, error handling on DB ops
- `[x]` **CollectionSidebar.tsx** — Fix delete cascade, dropdown auto-close, ID collisions, search in folders, prompt() → modal, debounce search, confirm callbacks

## Phase 4: Supporting Components & Desktop
- `[x]` **ResponseWorkspace.tsx** — Fix hooks called conditionally (CRITICAL), useMemo side effects, history query limit, status code 0, CSV escape, row detail escape key
- `[x]` **SettingsModal.tsx** — Fix escape close, backdrop close, unused imports, proxy URL validation, spinning icon
- `[x]` **CommandPalette.tsx** — Fix branding, search reset on close, backdrop close, competing keydown listeners
- `[x]` **TreeView.tsx** — Fix search auto-expand, renderNode memoization, expandAll performance
- `[x]` **CustomSelect.tsx** — Fix keyboard support, outside click, dropdown positioning, ARIA
- `[x]` **ModernConfirmModal.tsx** — Fix escape key, focus trap, async confirm support
- `[x]` **ResponseDiffPanel.tsx** — Fix JSON parse error feedback, textarea height, column order
- `[x]` **ResponseCharts.tsx** — Checked (Dead code/removed import references)
- `[x]` **desktop/main.js** — Secure bypass CORS natively using electron default session listeners, enable webSecurity: true, prevent scanning event loop blocking, close fs.open descriptors safely to prevent leaks
- `[x]` **desktop/Launcher.cs** — Prevent extraction race conditions using Mutex single instance lock, add premium dark setup splash popup feedback form, fix space-safe parameter quotes escaping
- `[x]` **desktop/build.cjs** — Portable windir csc path resolution, reference Forms and Drawing assemblies to enable Launcher setup form compilation

## Phase 5: Verification & Guide
- `[x]` Build verification (npm run build compiles React successfully)
- `[x]` Create walkthrough documentation
