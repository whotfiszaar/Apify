import { useState, useEffect, useRef, useMemo } from "react";
import { Search, Command, ArrowRight, Zap, Play, FileText, FolderPlus, Variable, Settings, HelpCircle, Terminal } from "lucide-react";
import { db, type RequestItem, type RequestHistoryItem } from "../db/db";
import { useLiveQuery } from "dexie-react-hooks";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onAction: (actionKey: string, payload?: any) => void;
}

interface CommandItem {
  id: string;
  category: "Actions" | "Requests" | "History";
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  shortcut?: string;
  actionKey: string;
  payload?: any;
}

export default function CommandPalette({ isOpen, onClose, onAction }: CommandPaletteProps) {
  const [search, setSearch] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const requests = (useLiveQuery(() => db.requests.toArray()) as RequestItem[]) || [];
  const history = (useLiveQuery(() => db.history.orderBy("timestamp").reverse().limit(15).toArray()) as RequestHistoryItem[]) || [];

  // --- Move declarations ABOVE useEffect/render paths to avoid TDZ (Temporal Dead Zone) Crashes ---

  // List of standard actions
  const actionItems: CommandItem[] = useMemo(() => [
    {
      id: "act-send",
      category: "Actions",
      title: "Send Request",
      subtitle: "Execute active request immediately",
      icon: <Play className="h-3.5 w-3.5 text-emerald-400" />,
      shortcut: "Ctrl+Enter",
      actionKey: "send-request",
    },
    {
      id: "act-create-req",
      category: "Actions",
      title: "Create New Request",
      subtitle: "Add a draft request in current workspace",
      icon: <Zap className="h-3.5 w-3.5 text-amber-400" />,
      shortcut: "Ctrl+N",
      actionKey: "create-request",
    },
    {
      id: "act-create-coll",
      category: "Actions",
      title: "Create New Collection",
      subtitle: "Group your API resources beautifully",
      icon: <FolderPlus className="h-3.5 w-3.5 text-blue-400" />,
      shortcut: "Ctrl+Shift+C",
      actionKey: "create-collection",
    },
    {
      id: "act-import",
      category: "Actions",
      title: "Import Postman Collection",
      subtitle: "Import v2 / v2.1 collections instantly",
      icon: <Terminal className="h-3.5 w-3.5 text-indigo-400" />,
      shortcut: "Ctrl+I",
      actionKey: "import-collection",
    },
    {
      id: "act-variables",
      category: "Actions",
      title: "Manage Global Variables",
      subtitle: "Review tokens, baseUrl keys, and secrets",
      icon: <Variable className="h-3.5 w-3.5 text-violet-400" />,
      shortcut: "Ctrl+Shift+V",
      actionKey: "manage-variables",
    },
    {
      id: "act-focus-url",
      category: "Actions",
      title: "Focus URL Address Bar",
      subtitle: "Jump straight to typing endpoint",
      icon: <Search className="h-3.5 w-3.5 text-neutral-400" />,
      shortcut: "Ctrl+L",
      actionKey: "focus-url",
    },
    {
      id: "act-settings",
      category: "Actions",
      title: "Open Preferences & Themes Settings",
      subtitle: "Customize visual styles, keyboard hotkeys, and proxy routing",
      icon: <Settings className="h-3.5 w-3.5 text-neutral-400" />,
      actionKey: "open-settings",
    }
  ], []);

  // Compute final combined matches filtered by search
  const matches = useMemo(() => {
    const term = search.toLowerCase().trim();

    // Map requests
    const mappedReqs: CommandItem[] = requests.map((r) => ({
      id: `req-${r.id}`,
      category: "Requests",
      title: `Open request: ${r.name}`,
      subtitle: `${r.method}  •  ${r.url}`,
      icon: <FileText className="h-3.5 w-3.5 text-neutral-400" />,
      actionKey: "open-request",
      payload: r.id,
    }));

    // Map histories
    const mappedHist: CommandItem[] = history.map((h, idx) => ({
      id: `hist-${h.id}-${idx}`,
      category: "History",
      title: `Replay log: [${h.method}] ${h.url}`,
      subtitle: `Status ${h.status} (${h.duration}ms)  •  ${new Date(h.timestamp).toLocaleTimeString()}`,
      icon: <Play className="h-3.5 w-3.5 text-teal-400" />,
      actionKey: "replay-history",
      payload: h,
    }));

    const all = [...actionItems, ...mappedReqs, ...mappedHist];

    if (!term) return all;

    return all.filter(
      (item) =>
        item.title.toLowerCase().includes(term) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(term)) ||
        item.category.toLowerCase().includes(term)
    );
  }, [search, actionItems, requests, history]);

  // Reset search when the command palette is closed
  useEffect(() => {
    if (!isOpen) {
      setSearch("");
    }
  }, [isOpen]);

  // Combine keydown listeners for escape key and navigation to avoid leaks
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowDown") {
        if (matches.length > 0) {
          e.preventDefault();
          setActiveIndex((prev) => (prev + 1) % matches.length);
        }
      } else if (e.key === "ArrowUp") {
        if (matches.length > 0) {
          e.preventDefault();
          setActiveIndex((prev) => (prev - 1 + matches.length) % matches.length);
        }
      } else if (e.key === "Enter") {
        if (matches.length > 0) {
          e.preventDefault();
          const activeItem = matches[activeIndex];
          if (activeItem) {
            onAction(activeItem.actionKey, activeItem.payload);
            onClose();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, activeIndex, matches, onAction, onClose]);

  // Adjust active index when matches change
  useEffect(() => {
    setActiveIndex(0);
  }, [search]);

  // Scroll active item into view
  useEffect(() => {
    if (!scrollContainerRef.current) return;
    const activeEl = scrollContainerRef.current.querySelector(`[data-index="${activeIndex}"]`);
    if (activeEl) {
      activeEl.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 pt-[12vh] px-4 backdrop-blur-[2px] font-sans"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-2xl rounded-xl border border-neutral-800 bg-neutral-950 shadow-2xl text-neutral-300 overflow-hidden flex flex-col max-h-[70vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Box */}
        <div className="flex items-center gap-3 border-b border-neutral-900 px-4 py-3.5 bg-neutral-950 shrink-0">
          <Command className="h-5 w-5 text-neutral-400 shrink-0" />
          <input
            type="text"
            placeholder="Type a command, search requests or histories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-sm text-white placeholder-neutral-600 focus:outline-none"
            autoFocus
          />
          <span className="text-[10px] bg-neutral-900 border border-neutral-850 text-neutral-500 px-2 py-0.5 rounded font-mono shrink-0 select-none">
            ESC
          </span>
        </div>

        {/* Results List */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto p-2 divide-y divide-neutral-950/20 scrollbar-thin"
        >
          {matches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <HelpCircle className="h-6 w-6 text-neutral-600 mb-2" />
              <p className="text-xs text-neutral-500 font-medium">No results found for "{search}"</p>
              <p className="text-[10px] text-neutral-600 mt-1 max-w-xs leading-relaxed">
                Try typing commands like "Send", "Create", or specific request URLs.
              </p>
            </div>
          ) : (
            <div>
              {/* Grouping headers and rendering matches */}
              {(() => {
                let lastCategory = "";
                return matches.map((item, idx) => {
                  const isCategoryHeader = item.category !== lastCategory;
                  lastCategory = item.category;
                  const isActive = idx === activeIndex;

                  return (
                    <div key={item.id}>
                      {isCategoryHeader && (
                        <div className="px-3 py-1.5 text-[9px] font-bold text-neutral-500 uppercase tracking-widest bg-neutral-900/10 font-sans select-none">
                          {item.category}
                        </div>
                      )}
                      <div
                        data-index={idx}
                        onClick={() => {
                          onAction(item.actionKey, item.payload);
                          onClose();
                        }}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                          isActive
                            ? "bg-neutral-900 text-white font-bold"
                            : "text-neutral-400 hover:bg-neutral-900/40 hover:text-neutral-200"
                        }`}
                      >
                        <div className={`shrink-0 ${isActive ? "text-emerald-400 animate-pulse" : ""}`}>
                          {item.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold truncate text-neutral-200">{item.title}</p>
                          {item.subtitle && (
                            <p className="text-[10px] text-neutral-500 truncate mt-0.5 font-mono">
                              {item.subtitle}
                            </p>
                          )}
                        </div>
                        {item.shortcut ? (
                          <span className="text-[9px] bg-neutral-950 border border-neutral-900 text-neutral-500 px-2 py-0.5 rounded font-mono shrink-0 select-none">
                            {item.shortcut}
                          </span>
                        ) : isActive ? (
                          <ArrowRight className="h-3 w-3 text-emerald-400 shrink-0" />
                        ) : null}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div className="border-t border-neutral-900 px-4 py-2 bg-neutral-900/20 shrink-0 flex items-center justify-between text-[10px] text-neutral-500 font-mono select-none">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 font-sans">
              <span className="bg-neutral-900 px-1.5 py-0.5 rounded border border-neutral-850 font-mono">↑↓</span> Move
            </span>
            <span className="flex items-center gap-1 font-sans">
              <span className="bg-neutral-900 px-1.5 py-0.5 rounded border border-neutral-850 font-mono">↵</span> Select
            </span>
          </div>
          <div>
            <span className="font-sans">RestMan Workspace</span>
          </div>
        </div>
      </div>
    </div>
  );
}
