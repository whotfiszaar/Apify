const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

function createWindow() {
  const win = new BrowserWindow({
    width: 1300,
    height: 850,
    show: false, // Hide initial launch to prevent flashing non-maximized size
    title: "Apify - Premium API Studio",
    icon: path.join(__dirname, process.platform === 'win32' ? 'icon.ico' : 'icon.png'),
    autoHideMenuBar: true,
    backgroundColor: "#151515",
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#151515',
      symbolColor: '#a3a3a3',
      height: 44
    },
    webPreferences: {
      webSecurity: true, // Securely enable webSecurity
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Maximize immediately
  win.maximize();

  // Load the single-file built HTML of the React app
  win.loadFile(path.join(__dirname, 'dist', 'index.html'));

  win.once('ready-to-show', () => {
    win.show();
  });

  // Open any external markdown links/docs in user's default browser instead of Electron
  win.webContents.setWindowOpenHandler(({ url }) => {
    require('electron').shell.openExternal(url);
    return { action: 'deny' };
  });
}

// Directory scanning depth and folders to ignore
const MAX_SCAN_DEPTH = 3;
const IGNORED_FOLDERS = new Set([
  'node_modules', '.git', 'cache', 'gpucache', 'code cache', 'logs',
  'local storage', 'session storage', 'network', 'dictionaries',
  'bin', 'obj', 'packages', 'dist', 'build', 'temp', 'tmp',
  'system volume information', '$recycle.bin', 'appdata'
]);

// Recursive directory scanner for Postman collections
async function scanDir(dirPath, depth = 0) {
  if (depth > MAX_SCAN_DEPTH) return [];
  let collections = [];
  try {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const entryName = entry.name;
      const entryLower = entryName.toLowerCase();

      // Skip hidden folders and ignored folders
      if (entryName.startsWith('.') || IGNORED_FOLDERS.has(entryLower)) {
        continue;
      }

      const fullPath = path.join(dirPath, entryName);

      if (entry.isDirectory()) {
        const subCollections = await scanDir(fullPath, depth + 1);
        collections = collections.concat(subCollections);
      } else if (entry.isFile() && entryLower.endsWith('.json')) {
        let fd = null;
        try {
          const stat = await fs.promises.stat(fullPath);
          if (stat.size > 15 * 1024 * 1024) continue; // Skip files larger than 15MB

          // Read the first 2KB of the file to inspect the schema (safely wrap fd)
          fd = await fs.promises.open(fullPath, 'r');
          const buffer = Buffer.alloc(2048);
          const { bytesRead } = await fd.read(buffer, 0, 2048, 0);
          await fd.close();
          fd = null; // Mark closed

          const prefix = buffer.toString('utf8', 0, bytesRead);
          if (
            prefix.includes('info') &&
            prefix.includes('name') &&
            (prefix.includes('schema.getpostman.com') || prefix.includes('schema.postman.com') || prefix.includes('postman_collection'))
          ) {
            // Match found! Read full content and parse
            const fileContent = await fs.promises.readFile(fullPath, 'utf8');
            const data = JSON.parse(fileContent);
            if (data.info && data.info.name && (data.info.schema || Array.isArray(data.item))) {
              let requestsCount = 0;
              let foldersCount = 0;

              function countItems(items) {
                if (!Array.isArray(items)) return;
                for (const item of items) {
                  if (item.item) {
                    foldersCount++;
                    countItems(item.item);
                  } else if (item.request) {
                    requestsCount++;
                  }
                }
              }

              countItems(data.item);

              collections.push({
                filePath: fullPath,
                fileName: entryName,
                collectionName: data.info.name,
                requestsCount,
                foldersCount,
                content: fileContent
              });
            }
          }
        } catch (e) {
          // Skip unreadable / malformed files
        } finally {
          if (fd) {
            try {
              await fd.close();
            } catch (closeErr) {}
          }
        }
      }
    }
  } catch (e) {
    // Skip directories we cannot read (permissions, locked, etc)
  }
  return collections;
}

// IPC listener for scanning (asynchronous non-blocking exists checks)
ipcMain.handle('scan-postman', async () => {
  const userHome = os.homedir();
  const appData = process.env.APPDATA || path.join(userHome, 'AppData', 'Roaming');
  const localAppData = process.env.LOCALAPPDATA || path.join(userHome, 'AppData', 'Local');

  const scanDirs = [
    path.join(appData, 'Postman'),
    path.join(localAppData, 'Postman'),
    path.join(userHome, 'Postman'),
    path.join(userHome, 'Downloads'),
    path.join(userHome, 'Documents'),
    path.join(userHome, 'Desktop')
  ];

  const validDirs = [];
  for (const dir of scanDirs) {
    try {
      const stat = await fs.promises.stat(dir);
      if (stat.isDirectory()) {
        validDirs.push(dir);
      }
    } catch (e) {}
  }

  const scanPromises = validDirs.map(dir => scanDir(dir, 0));
  const results = await Promise.all(scanPromises);
  const allCollections = results.flat();

  // De-duplicate by file path
  const unique = [];
  const seen = new Set();
  for (const col of allCollections) {
    if (!seen.has(col.filePath)) {
      seen.add(col.filePath);
      unique.push(col);
    }
  }

  return unique;
});

// Listener to update titlebar overlay colors dynamically based on selected theme
ipcMain.on('set-theme', (event, themeId) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return;

  let color = '#151515';
  let symbolColor = '#a3a3a3';

  switch (themeId) {
    case 'light':
      color = '#fafafa';
      symbolColor = '#1f1f1f';
      break;
    case 'high-contrast-light':
      color = '#ffffff';
      symbolColor = '#000000';
      break;
    case 'high-contrast-dark':
      color = '#000000';
      symbolColor = '#ffffff';
      break;
    case 'ayu-light':
      color = '#fafafa';
      symbolColor = '#5c6773';
      break;
    case 'ayu-dark':
      color = '#0f1419';
      symbolColor = '#e6b450';
      break;
    case 'dracula':
      color = '#282a36';
      symbolColor = '#f8f8f2';
      break;
    case 'monokai':
      color = '#272822';
      symbolColor = '#f8f8f2';
      break;
    case 'night-owl-light':
      color = '#fafcff';
      symbolColor = '#403f53';
      break;
    case 'night-owl-dark':
      color = '#011627';
      symbolColor = '#d6deeb';
      break;
    case 'solarized-light':
      color = '#fdf6e3';
      symbolColor = '#586e75';
      break;
    case 'solarized-dark':
      color = '#002b36';
      symbolColor = '#839496';
      break;
    case 'nord':
      color = '#2e3440';
      symbolColor = '#d8dee9';
      break;
    default:
      color = '#1e1e1e';
      symbolColor = '#e1e1e1';
      break;
  }

  try {
    if (process.platform === 'win32' && win.setTitleBarOverlay) {
      win.setTitleBarOverlay({
        color: color,
        symbolColor: symbolColor
      });
    }
  } catch (err) {
    console.error("Failed to update titlebar overlay:", err);
  }
});

// Configure custom headers handling on session setup to bypass CORS natively while keeping webSecurity enabled
app.whenReady().then(() => {
  if (process.platform === 'win32') {
    app.setAppUserModelId("com.apify.app");
  }
  const filter = { urls: ['http://*/*', 'https://*/*'] };

  // Strip origin and referer to prevent server CORS issues
  session.defaultSession.webRequest.onBeforeSendHeaders(filter, (details, callback) => {
    const headers = details.requestHeaders;
    delete headers['Origin'];
    delete headers['Referer'];
    callback({ requestHeaders: headers });
  });

  // Inject wildcard access headers to allow client access
  session.defaultSession.webRequest.onHeadersReceived(filter, (details, callback) => {
    const headers = details.responseHeaders || {};
    headers['Access-Control-Allow-Origin'] = ['*'];
    headers['Access-Control-Allow-Headers'] = ['*'];
    headers['Access-Control-Allow-Methods'] = ['*'];
    callback({ responseHeaders: headers });
  });

  createWindow();

  ipcMain.handle('download-and-install-update', async (event, downloadUrl) => {
    try {
      const response = await fetch(downloadUrl);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      const currentExePath = app.getPath('exe');
      const tempDir = os.tmpdir();
      const tempNewExePath = path.join(tempDir, 'Apify_new.exe');
      
      fs.writeFileSync(tempNewExePath, buffer);
      
      const batPath = path.join(tempDir, 'update_apify.bat');
      const batContent = `@echo off\r\n` +
        `timeout /t 2 /nobreak > nul\r\n` +
        `copy /y "${tempNewExePath}" "${currentExePath}"\r\n` +
        `start "" "${currentExePath}"\r\n` +
        `del "%~f0"\r\n`;
      fs.writeFileSync(batPath, batContent);
      
      const { spawn } = require('child_process');
      const child = spawn('cmd.exe', ['/c', batPath], {
        detached: true,
        stdio: 'ignore'
      });
      child.unref();
      
      app.quit();
      return { success: true };
    } catch (err) {
      console.error('Update download/install failed:', err);
      return { success: false, error: err.message };
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
