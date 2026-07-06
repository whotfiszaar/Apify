# Custom Agent Rules for Restman Workspace

Whenever completing changes or resolving issues in the Restman codebase, you **must** perform the following pipeline before ending your turn:

1. **Build Standalone Executable**:
   - Run `node desktop/build.cjs` to compile the Vite code, package the Electron runtime, zip the assets, and compile the single-file Windows C# launcher into `release-builds/Restman.exe`.

2. **Commit and Push to Git**:
   - Use the absolute path `C:\Program Files\Git\cmd\git.exe` to stage all modifications:
     ```powershell
     & "C:\Program Files\Git\cmd\git.exe" add .
     & "C:\Program Files\Git\cmd\git.exe" commit -m "<Description of changes>"
     & "C:\Program Files\Git\cmd\git.exe" push
     ```

3. **Deploy to Vercel**:
   - Run `npx vercel --prod --yes` to deploy the latest release of the web app directly to production (visible at `https://restman-gold.vercel.app`).
