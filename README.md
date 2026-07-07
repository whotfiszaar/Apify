# ⚡ Apify — Premium Offline-First API Workstation

> A blazing-fast, premium offline-first REST API workstation client and developer studio.
> **No cloud sync. No telemetry. Zero tracking.** Just a clean, powerful workstation that runs entirely on your local machine.

---

## 🌟 Key Features

### 🚀 Windows Standalone Single-File Executable
- Built using **Electron** packaged inside a compiled **C# Launcher wrapper** (`Apify.exe`).
- Launches in **under 200ms**, bypassing browser sandbox boundaries and strictly-enforced CORS server constraints.
- Direct filesystem access for importing and exporting large Postman collections.

### 📱 High-Tech Progressive Web App (PWA)
- Fully installable from modern web browsers (Chrome, Edge, Safari).
- Instantly adds to your desktop/dock with a premium high-resolution icon.
- Full offline caching using **Service Workers** (`sw.js`) and IndexedDB.
- Pulsing glassmorphic **Install App** tooltip in the status bar for zero-friction installation.

### 🔄 Native GitHub Auto-Updater
- One-click update check against GitHub releases directly from the **About** tab in Settings.
- Downloads new executable releases in the background.
- Employs an in-place restart trick (using a detached batch script) to overwrite the running executable and restart the application automatically.

### ☀️ Adaptive Theme Engine & Unified UI
- 100% theme-adaptive layout including Settings, Variable modallings, and Command Palettes.
- Dynamic native Electron title bar color integration matching your active theme.
- Out-of-the-box themes: **Dracula, Monokai, Nord, Ayu Dark, Solarized Dark, and Classic Light**.
- Syncs automatically with your operating system color preference by default.

### 🔑 Advanced Variables Studio
- Real-time environment variable interpolation using `${variableName}` syntax.
- **Hover-to-Preview**: Hover over any request URL or parameter variable to see its resolved value and edit it on-the-fly.

### 📊 Response Visualizations & Diagnostics
- View response data as **Pretty JSON**, **Table views**, **Insights dashboards**, **History**, or **Diff comparisons**.
- Visual performance charts plotting response size, latency, headers, and server details.

---

## 🛠️ Setup & Installation Documentation

### Option A: Standalone Windows App (Recommended)
1. Download the latest compiled launcher binary: [Apify.exe](https://github.com/whotfiszaar/Apify/releases/latest/download/Apify.exe).
2. Move `Apify.exe` to your preferred folder (e.g., `C:\Tools\Apify.exe`).
3. Double-click the file to launch. No install setup wizard or administrator rights are required.

### Option B: Progressive Web App (PWA) Web Version
1. Open the web client: [apify-rest.vercel.app](https://apify-rest.vercel.app).
2. Locate the **Install App** button with the pulsing indicator in the bottom status bar.
3. Click the button to trigger the browser prompt and confirm the installation.
4. Apify will now run in a standalone application window with offline support.

### Option C: Local Development Build
To compile the source code and build the single-file executable locally:
1. Clone the repository:
   ```bash
   git clone https://github.com/whotfiszaar/Apify.git
   cd Apify
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server locally:
   ```bash
   npm run dev
   ```
4. Build the standalone single-file Windows executable:
   ```bash
   node desktop/build.cjs
   ```
   *(Note: This requires the C# compiler `csc.exe` to compile the launcher).*

---

## 🔒 Privacy & Data Policy
Apify is built with privacy-first developer principles:
- **No Cloud Storing:** All API collection items, headers, environmental values, and request profiles are stored locally in your browser/app container via Dexie IndexedDB.
- **No Tracking:** No tracking cookies, Google Analytics, or remote telemetry scripts are active.
- **Direct Pipeline:** Network requests are sent directly from your own browser or application instance to your destination server.

---

Designed by **Akib** | Free to use under the **MIT License**.
