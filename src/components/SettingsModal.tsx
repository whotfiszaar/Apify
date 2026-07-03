import { X, Terminal, Settings, HelpCircle, Sun, Info, ShieldCheck, Check } from "lucide-react";
import { useState, useEffect } from "react";
import { db } from "../db/db";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: string;
  onThemeChange: (theme: string) => void;
  useProxy: boolean;
  onProxyChange: (val: boolean) => void;
  proxyUrl: string;
  onProxyUrlChange: (val: string) => void;
}

const THEMES = [
  {
    id: "dark",
    name: "Dark (VS Code Modern)",
    sidebarBg: "bg-[#181818]",
    appBg: "bg-[#1e1e1e]",
    borderBg: "border-[#2d2d2d]",
    accentBg: "bg-[#007acc]",
    textColor: "text-[#e1e1e1]",
  },
  {
    id: "light",
    name: "Light (Classic)",
    sidebarBg: "bg-[#f3f3f3]",
    appBg: "bg-[#ffffff]",
    borderBg: "border-[#e4e4e7]",
    accentBg: "bg-[#0066cc]",
    textColor: "text-[#333333]",
  },
  {
    id: "dracula",
    name: "Dracula",
    sidebarBg: "bg-[#21222c]",
    appBg: "bg-[#282a36]",
    borderBg: "border-[#44475a]",
    accentBg: "bg-[#bd93f9]",
    textColor: "text-[#f8f8f2]",
  },
  {
    id: "monokai",
    name: "Monokai Pro",
    sidebarBg: "bg-[#1e1f1c]",
    appBg: "bg-[#272822]",
    borderBg: "border-[#3e3d32]",
    accentBg: "bg-[#a6e22e]",
    textColor: "text-[#f8f8f2]",
  },
  {
    id: "ayu-dark",
    name: "Ayu Dark",
    sidebarBg: "bg-[#0a0e14]",
    appBg: "bg-[#0f1419]",
    borderBg: "border-[#1a232c]",
    accentBg: "bg-[#ffb454]",
    textColor: "text-[#e6b450]",
  },
  {
    id: "solarized-dark",
    name: "Solarized Dark",
    sidebarBg: "bg-[#073642]",
    appBg: "bg-[#002b36]",
    borderBg: "border-[#586e75]",
    accentBg: "bg-[#2aa198]",
    textColor: "text-[#93a1a1]",
  },
];

export default function SettingsModal({
  isOpen,
  onClose,
  theme,
  onThemeChange,
  useProxy,
  onProxyChange,
  proxyUrl,
  onProxyUrlChange,
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<"general" | "themes" | "shortcuts" | "about">("general");

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmInput !== "delete all collections") return;
    setIsDeleting(true);

    try {
      await db.transaction("rw", [db.collections, db.folders, db.requests, db.tabs], async () => {
        await db.collections.clear();
        await db.folders.clear();
        await db.requests.clear();
        await db.tabs.clear();
      });
      setDeleteConfirmOpen(false);
      setConfirmInput("");
      onClose();
      window.location.reload();
    } catch (err) {
      console.error("Failed to delete all collections:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Close settings modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isOpen && e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in font-sans"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-3xl h-[480px] rounded-xl border border-neutral-800 bg-[#181818] shadow-2xl text-neutral-200 flex overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Left Sidebar Menu */}
        <div className="w-48 bg-[#151515] border-r border-neutral-900 p-3 flex flex-col gap-1.5 shrink-0">
          <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">
            <Settings className="h-4 w-4 text-neutral-500" />
            <span>Preferences</span>
          </div>

          <button
            onClick={() => setActiveTab("general")}
            className={`w-full text-left px-3 py-2 text-xs rounded-lg font-semibold transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === "general" ? "bg-neutral-800 text-white" : "text-neutral-400 hover:text-neutral-250 hover:bg-neutral-900"
            }`}
          >
            <Terminal className="h-3.5 w-3.5" />
            <span>General / Network</span>
          </button>

          <button
            onClick={() => setActiveTab("themes")}
            className={`w-full text-left px-3 py-2 text-xs rounded-lg font-semibold transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === "themes" ? "bg-neutral-800 text-white" : "text-neutral-400 hover:text-neutral-250 hover:bg-neutral-900"
            }`}
          >
            <Sun className="h-3.5 w-3.5 text-amber-400" />
            <span>Themes Setting</span>
          </button>

          <button
            onClick={() => setActiveTab("shortcuts")}
            className={`w-full text-left px-3 py-2 text-xs rounded-lg font-semibold transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === "shortcuts" ? "bg-neutral-800 text-white" : "text-neutral-400 hover:text-neutral-250 hover:bg-neutral-900"
            }`}
          >
            <HelpCircle className="h-3.5 w-3.5" />
            <span>Shortcuts</span>
          </button>

          <button
            onClick={() => setActiveTab("about")}
            className={`w-full text-left px-3 py-2 text-xs rounded-lg font-semibold transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === "about" ? "bg-neutral-800 text-white" : "text-neutral-400 hover:text-neutral-250 hover:bg-neutral-900"
            }`}
          >
            <Info className="h-3.5 w-3.5 text-blue-400" />
            <span>About RestMan</span>
          </button>
        </div>

        {/* Right Content Panel */}
        <div className="flex-1 flex flex-col bg-[#1e1e1e]">
          {/* Header */}
          <div className="px-4 py-3 border-b border-neutral-900 flex items-center justify-between shrink-0">
            <h3 className="text-sm font-bold text-white capitalize">
              {activeTab === "general" && "General & Network Settings"}
              {activeTab === "themes" && "Visual Theme Selection"}
              {activeTab === "shortcuts" && "Keyboard Shortcuts"}
              {activeTab === "about" && "About RestMan Studio"}
            </h3>
            <button
              onClick={onClose}
              className="rounded-lg p-1 hover:bg-neutral-900 text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-5 scrollbar-thin text-xs text-neutral-300">
            
            {/* GENERAL TAB */}
            {activeTab === "general" && (
              <div className="flex flex-col gap-5">
                <div>
                  <h4 className="font-semibold text-white mb-1.5">Request Settings</h4>
                  <p className="text-[11px] text-neutral-400 leading-relaxed">
                    Configure connection parameters. Request changes are securely auto-saved into local workspace database sandbox.
                  </p>
                </div>

                <div className="border-t border-neutral-900/60 pt-4 flex flex-col gap-3">
                  <h4 className="font-semibold text-white flex items-center gap-1.5 font-sans">
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                    CORS Bypass Proxy configuration
                  </h4>
                  
                  <div className="flex items-start gap-2.5 py-1">
                    <input
                      type="checkbox"
                      id="proxy-toggle"
                      checked={useProxy}
                      onChange={(e) => onProxyChange(e.target.checked)}
                      className="rounded border-neutral-800 bg-neutral-950 text-emerald-600 h-4 w-4 cursor-pointer mt-0.5 accent-emerald-500"
                    />
                    <div>
                      <label htmlFor="proxy-toggle" className="text-xs font-bold text-neutral-200 cursor-pointer font-sans">
                        Route HTTP requests through Proxy Server
                      </label>
                      <p className="text-[10px] text-neutral-500 mt-0.5 leading-relaxed font-sans">
                        Redirects network packets through an intermediate server. Useful in web build mode when CORS headers are strictly enforced.
                      </p>
                    </div>
                  </div>

                  {useProxy && (
                    <div className="mt-2 animate-fade-in">
                      <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1 font-mono">
                        Proxy Router Endpoint URL
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. https://cors-anywhere.herokuapp.com/"
                        value={proxyUrl}
                        onChange={(e) => onProxyUrlChange(e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-xs text-neutral-200 focus:outline-none focus:border-emerald-500 font-mono"
                      />
                      <span className="text-[9px] text-neutral-500 block mt-1.5 leading-relaxed font-sans">
                        Ensure the proxy URL ends with a forward slash and is actively running. Requests will be prefixed like: <code className="text-neutral-400 font-mono">{proxyUrl || "[Proxy-URL]"}https://api.example.com</code>.
                      </span>
                    </div>
                  )}
                </div>

                {/* DANGER ZONE */}
                <div className="border-t border-red-950/40 border-dashed pt-4 flex flex-col gap-3 mt-2 font-sans">
                  <h4 className="font-semibold text-red-400 flex items-center gap-1.5">
                    Danger Zone
                  </h4>
                  <div className="flex items-center justify-between bg-red-950/10 border border-red-900/20 rounded-lg p-3">
                    <div>
                      <p className="text-xs font-bold text-neutral-200">Delete All Collections</p>
                      <p className="text-[10px] text-neutral-500 mt-0.5 leading-relaxed max-w-md">
                        Recursively clears all collections, folders, request items, and open tabs. This action is permanent and cannot be undone.
                      </p>
                    </div>
                    <button
                      onClick={() => setDeleteConfirmOpen(true)}
                      className="px-3 py-1.5 bg-red-900 hover:bg-red-800 text-red-100 rounded text-xs font-semibold cursor-pointer transition-colors shrink-0"
                    >
                      Delete All
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* THEMES TAB */}
            {activeTab === "themes" && (
              <div className="flex flex-col gap-4">
                <p className="text-[11px] text-neutral-400 mb-2 font-sans">
                  Select a style to customize the IDE visual presentation. The interface will instantly adapt to color presets.
                </p>

                <div className="grid grid-cols-2 gap-4">
                  {THEMES.map((t) => {
                    const isSelected = theme === t.id;
                    return (
                      <div
                        key={t.id}
                        onClick={() => onThemeChange(t.id)}
                        className={`group rounded-lg border p-3 flex flex-col gap-2.5 cursor-pointer transition-all duration-150 relative bg-neutral-950/40 hover:bg-neutral-950 ${
                          isSelected ? "border-emerald-500 ring-1 ring-emerald-500/20" : "border-neutral-850 hover:border-neutral-700"
                        }`}
                      >
                        {/* Theme graphic preview card */}
                        <div className={`h-16 w-full rounded border ${t.borderBg} ${t.appBg} overflow-hidden flex flex-col relative`}>
                          {/* Mini Header bar */}
                          <div className={`h-3 ${t.sidebarBg} border-b ${t.borderBg} flex items-center justify-between px-1.5`}>
                            <div className="flex items-center gap-0.5">
                              <span className="h-1 w-1 rounded-full bg-rose-500 opacity-60"></span>
                              <span className="h-1 w-1 rounded-full bg-amber-500 opacity-60"></span>
                              <span className="h-1 w-1 rounded-full bg-emerald-500 opacity-60"></span>
                            </div>
                            <span className="text-[6px] opacity-40 font-mono">Restman</span>
                          </div>

                          <div className="flex-1 flex">
                            {/* Mini Sidebar */}
                            <div className={`w-8 ${t.sidebarBg} border-r ${t.borderBg} p-1 flex flex-col gap-0.5`}>
                              <span className="h-0.5 w-4 bg-neutral-500/20 rounded"></span>
                              <span className="h-0.5 w-5 bg-neutral-500/10 rounded"></span>
                              <span className="h-0.5 w-3 bg-neutral-500/15 rounded"></span>
                            </div>

                            {/* Mini Workspace */}
                            <div className="flex-1 p-1 flex flex-col justify-between">
                              <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-1">
                                  <span className="h-1.5 w-3 bg-emerald-600/30 rounded"></span>
                                  <span className="h-1 w-8 bg-neutral-500/20 rounded"></span>
                                </div>
                                <span className="h-0.5 w-full bg-neutral-500/10 rounded"></span>
                              </div>

                              {/* Send button in preview */}
                              <div className="flex justify-end">
                                <span className={`h-1.5 w-4 rounded-sm ${t.accentBg}`}></span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Theme Name selection label */}
                        <div className="flex items-center justify-between font-sans">
                          <span className={`text-[11px] font-semibold ${isSelected ? "text-white" : "text-neutral-400 group-hover:text-neutral-200"}`}>
                            {t.name}
                          </span>
                          <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                            isSelected ? "bg-emerald-600 border-emerald-500 text-white" : "border-neutral-800"
                          }`}>
                            {isSelected && <Check className="h-2.5 w-2.5 font-bold" />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SHORTCUTS TAB */}
            {activeTab === "shortcuts" && (
              <div className="flex flex-col gap-3">
                <p className="text-[11px] text-neutral-400 mb-2 font-sans">
                  Accelerate your API development workflow with native keyboard shortcuts.
                </p>

                <div className="border border-neutral-900 rounded-lg overflow-hidden bg-neutral-950/30">
                  <table className="w-full border-collapse text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-neutral-900 bg-neutral-900/30 text-neutral-400 text-[10px] font-sans font-semibold">
                        <th className="py-2 px-3">Action</th>
                        <th className="py-2 px-3 text-right">Hotkey Command</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-900/50">
                      {[
                        { action: "Open Command Palette", key: "Ctrl + P" },
                        { action: "Send Request", key: "Ctrl + Enter" },
                        { action: "Search Endpoints globally", key: "Ctrl + Shift + F" },
                        { action: "Toggle Sidebar panel", key: "Ctrl + B" },
                        { action: "Toggle Response panel", key: "Ctrl + J" },
                        { action: "Format JSON Body", key: "Ctrl + Alt + L" },
                        { action: "Create new Tab", key: "Ctrl + T" },
                        { action: "Close current Tab", key: "Ctrl + W" },
                      ].map((s, idx) => (
                        <tr key={idx} className="hover:bg-neutral-900/25">
                          <td className="py-2 px-3 font-sans font-medium text-neutral-350">{s.action}</td>
                          <td className="py-2 px-3 text-right">
                            <span className="bg-neutral-900 border border-neutral-850 px-2 py-0.5 rounded text-[10px] font-semibold text-neutral-200">
                              {s.key}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ABOUT TAB */}
            {activeTab === "about" && (
              <div className="flex flex-col items-center justify-center text-center gap-4 py-8 font-sans">
                <div className="h-16 w-16 bg-[#007acc]/10 border border-[#007acc]/30 rounded-2xl flex items-center justify-center shadow-xl shadow-emerald-500/2">
                  {/* Settings icon is static in premium feel */}
                  <Settings className="h-8 w-8 text-[#007acc]" />
                </div>

                <div>
                  <h4 className="text-base font-black tracking-widest text-white uppercase font-sans">RestMan</h4>
                  <p className="text-[10px] text-neutral-500 mt-0.5">Premium API Workspace Studio</p>
                </div>

                <p className="text-[11px] text-neutral-400 max-w-sm leading-relaxed font-sans">
                  A workstation built for lightweight HTTP communication, collection editing, and responsive dashboards. 100% offline and browser CORS-free.
                </p>

                <div className="flex flex-col gap-1 text-[10px] text-neutral-500 mt-4 border-t border-neutral-900 pt-4 w-full max-w-xs">
                  <div className="flex justify-between">
                    <span>Engine Client Version:</span>
                    <span className="font-mono text-neutral-400">v1.2.0 (2026 Edition)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Database Engine:</span>
                    <span className="font-mono text-neutral-400">IndexedDB via Dexie.js</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Developer Signature:</span>
                    <span className="font-sans font-semibold text-emerald-400">Designed by Akib</span>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-neutral-900 flex justify-end shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-[#007acc] hover:bg-[#0062a3] text-white rounded text-xs font-semibold cursor-pointer transition-colors"
            >
              Done
            </button>
          </div>
        </div>

      </div>

      {/* GitHub-style Confirmation Modal */}
      {deleteConfirmOpen && (
        <div 
          className="fixed inset-0 z-[250] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-fade-in text-neutral-200"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="w-full max-w-md rounded-xl border border-red-900/30 bg-neutral-950 p-5 shadow-2xl flex flex-col gap-4 font-sans">
            <div className="flex items-center justify-between border-b border-neutral-900 pb-3">
              <h3 className="text-sm font-bold text-red-400 flex items-center gap-2">
                Are you absolutely sure?
              </h3>
              <button
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  setConfirmInput("");
                }}
                className="rounded-lg p-1 hover:bg-neutral-900 text-neutral-400 hover:text-white transition-colors cursor-pointer bg-transparent border-none"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="text-[11px] text-neutral-400 leading-relaxed bg-red-950/10 border border-red-955/25 p-3 rounded-lg flex flex-col gap-2">
              <p>This action **CANNOT** be undone. This will permanently delete all collections, folders, requests, and active tabs.</p>
            </div>

            <form onSubmit={handleDeleteAll} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold text-neutral-400">
                  Please type <code className="text-red-400 font-mono font-bold select-all bg-neutral-900 px-1 py-0.5 rounded">delete all collections</code> to confirm:
                </label>
                <input
                  type="text"
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  placeholder="delete all collections"
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white placeholder-neutral-700 focus:outline-none focus:border-red-500 font-mono"
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-neutral-900 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setDeleteConfirmOpen(false);
                    setConfirmInput("");
                  }}
                  className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-850 text-neutral-300 hover:text-white rounded text-xs font-semibold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={confirmInput !== "delete all collections" || isDeleting}
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-500 disabled:bg-red-950/40 disabled:text-red-500/60 text-white rounded text-xs font-semibold cursor-pointer transition-all border-none"
                >
                  {isDeleting ? "Deleting..." : "I understand the consequences, delete them"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
