import { useState, useMemo, useRef, useEffect } from "react";
import { db, type Collection, type Folder, type RequestItem } from "../db/db";
import { importPostmanCollection } from "../utils/postmanImporter";
import { exportPostmanCollection } from "../utils/postmanExporter";
import { useLiveQuery } from "dexie-react-hooks";
import ModernConfirmModal from "./ModernConfirmModal";
import {
  Folder as FolderIcon,
  FolderOpen,
  Plus,
  FolderPlus,
  MoreVertical,
  ChevronRight,
  ChevronDown,
  Search,
  Pin,
  Star,
  Trash2,
  Copy,
  Edit3,
  Upload,
  Layers,
  Check,
  AlertCircle,
  Settings,
  Loader2,
  RefreshCw,
  FolderDown,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface DiscoveredCollection {
  filePath: string;
  fileName: string;
  collectionName: string;
  requestsCount: number;
  foldersCount: number;
  content: string;
}

declare global {
  interface Window {
    electronAPI?: {
      scanPostman: () => Promise<DiscoveredCollection[]>;
      isElectron?: boolean;
    };
  }
}

interface CollectionSidebarProps {
  activeRequestId: string | null;
  onSelectRequest: (id: string) => void;
  onOpenVariables: () => void;
  onOpenSettings: () => void;
}

export default function CollectionSidebar({
  activeRequestId,
  onSelectRequest,
  onOpenVariables,
  onOpenSettings
}: CollectionSidebarProps) {
  // DB Subscriptions
  const collections = (useLiveQuery(() => db.collections.orderBy("createdAt").toArray()) as Collection[]) || [];
  const folders = (useLiveQuery(() => db.folders.orderBy("createdAt").toArray()) as Folder[]) || [];
  const requests = (useLiveQuery(() => db.requests.orderBy("createdAt").toArray()) as RequestItem[]) || [];

  // Local search state with debouncing
  const [localSearch, setLocalSearch] = useState("");
  const [search, setSearch] = useState("");
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const [expandedNodes, setExpandedPaths] = useState<Record<string, boolean>>({ "coll-jsonplaceholder": true });
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");

  // Custom Naming/Prompt Modal State
  const [inputModalState, setInputModalState] = useState<{
    isOpen: boolean;
    title: string;
    placeholder: string;
    defaultValue: string;
    onConfirm: (val: string) => void;
  } | null>(null);

  // Import State
  const [importOpen, setImportOpen] = useState(false);
  const [importJson, setImportJson] = useState("");
  const [importMsg, setImportMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // One-Click Import states
  const [importTab, setImportTab] = useState<"auto" | "manual">("auto");
  const [discovered, setDiscovered] = useState<DiscoveredCollection[]>([]);
  const [scanning, setScanning] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const [selectedDiscoveredPaths, setSelectedDiscoveredPaths] = useState<Record<string, boolean>>({});

  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isDestructive?: boolean;
  } | null>(null);

  // Auto-close menu dropdowns on click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (activeMenuId) {
        const target = e.target as HTMLElement;
        if (!target.closest(".menu-trigger-container")) {
          setActiveMenuId(null);
        }
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [activeMenuId]);

  // Debounced search text handler
  const handleSearchChange = (val: string) => {
    setLocalSearch(val);
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    searchDebounceRef.current = setTimeout(() => {
      setSearch(val);
    }, 200);
  };

  // Toggle node expansion
  const toggleNode = (id: string) => {
    setExpandedPaths((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Search filtering
  const filteredRequests = useMemo(() => {
    if (!search.trim()) return requests;
    const term = search.toLowerCase();
    return requests.filter(
      (r) =>
        r.name.toLowerCase().includes(term) ||
        r.url.toLowerCase().includes(term) ||
        r.method.toLowerCase().includes(term) ||
        (r.tags && r.tags.some((t) => t.toLowerCase().includes(term)))
    );
  }, [requests, search]);

  const filteredFolders = useMemo(() => {
    if (!search.trim()) return folders;
    const term = search.toLowerCase();
    
    // Matched folders set
    const visibleFolderIds = new Set<string>();
    const matchedRequestFolderIds = new Set(
      filteredRequests.map((r) => r.folderId).filter(Boolean) as string[]
    );

    folders.forEach((f) => {
      if (f.name.toLowerCase().includes(term) || matchedRequestFolderIds.has(f.id)) {
        visibleFolderIds.add(f.id);
        // Recursively add all parent folders to expand hierarchy visibility
        let parentId = f.parentFolderId;
        while (parentId) {
          visibleFolderIds.add(parentId);
          const parent = folders.find((pf) => pf.id === parentId);
          parentId = parent ? parent.parentFolderId : null;
        }
      }
    });

    return folders.filter((f) => visibleFolderIds.has(f.id));
  }, [folders, filteredRequests, search]);

  const filteredCollections = useMemo(() => {
    if (!search.trim()) return collections;
    const matchedRequestCollectionIds = new Set(filteredRequests.map((r) => r.collectionId));
    // Also include collections that contain matched folders
    const matchedFolderCollectionIds = new Set(filteredFolders.map((f) => f.collectionId));

    return collections.filter(
      (c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        matchedRequestCollectionIds.has(c.id) ||
        matchedFolderCollectionIds.has(c.id)
    );
  }, [collections, filteredRequests, filteredFolders, search]);

  // Pinned and Favorites lists
  const pinnedRequests = useMemo(() => requests.filter((r) => r.pinned), [requests]);
  const favoriteRequests = useMemo(() => requests.filter((r) => r.favorite), [requests]);

  // Method badging helper
  const getMethodBadge = (method: string) => {
    const colors: Record<string, string> = {
      GET: "text-emerald-400 bg-emerald-500/10 border-emerald-500/10",
      POST: "text-indigo-400 bg-indigo-500/10 border-indigo-500/10",
      PUT: "text-amber-400 bg-amber-500/10 border-amber-500/10",
      PATCH: "text-violet-400 bg-violet-500/10 border-violet-500/10",
      DELETE: "text-rose-400 bg-red-500/10 border-red-500/10",
      OPTIONS: "text-cyan-400 bg-cyan-500/10 border-cyan-500/10",
      HEAD: "text-neutral-400 bg-neutral-500/10 border-neutral-500/10",
    };
    return (
      <span className={`text-[9px] font-bold font-mono px-1.5 py-0.5 rounded border ${colors[method] || "text-neutral-400 bg-neutral-900"}`}>
        {method}
      </span>
    );
  };

  // Handler CRUD Actions with custom styled Prompt input modals
  const handleCreateCollection = () => {
    setInputModalState({
      isOpen: true,
      title: "Create Collection",
      placeholder: "e.g. Stripe API Suite",
      defaultValue: "New Collection",
      onConfirm: async (name) => {
        const id = `coll-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        await db.collections.add({
          id,
          name,
          createdAt: Date.now(),
        });
        setExpandedPaths((prev) => ({ ...prev, [id]: true }));
      }
    });
  };

  const handleCreateFolder = (collectionId: string, parentFolderId: string | null = null) => {
    setInputModalState({
      isOpen: true,
      title: "Create Folder",
      placeholder: "e.g. Auth Routes",
      defaultValue: "New Folder",
      onConfirm: async (name) => {
        const id = `folder-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        await db.folders.add({
          id,
          collectionId,
          parentFolderId,
          name,
          createdAt: Date.now(),
        });
        // Ensure parent is expanded
        setExpandedPaths((prev) => ({
          ...prev,
          [collectionId]: true,
          ...(parentFolderId ? { [parentFolderId]: true } : {}),
        }));
      }
    });
  };

  const handleCreateRequest = (collectionId: string, folderId: string | null = null) => {
    setInputModalState({
      isOpen: true,
      title: "Create Request",
      placeholder: "e.g. Get User details",
      defaultValue: "Untitled Request",
      onConfirm: async (name) => {
        const id = `req-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        await db.requests.add({
          id,
          collectionId,
          folderId,
          name,
          method: "GET",
          url: "",
          headers: [],
          params: [],
          auth: { type: "none" },
          body: { type: "none" },
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        // Auto expand parent
        if (folderId) setExpandedPaths((prev) => ({ ...prev, [folderId]: true }));
        else setExpandedPaths((prev) => ({ ...prev, [collectionId]: true }));

        onSelectRequest(id);
      }
    });
  };

  const handleDuplicateRequest = async (req: RequestItem) => {
    const id = `req-copy-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    await db.requests.add({
      ...req,
      id,
      name: `${req.name} (Copy)`,
      pinned: false,
      favorite: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    onSelectRequest(id);
  };

  const handleDuplicateCollection = async (collectionId: string) => {
    try {
      const coll = await db.collections.get(collectionId);
      if (!coll) return;

      const newCollId = `coll-copy-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

      await db.transaction("rw", [db.collections, db.folders, db.requests], async () => {
        // 1. Create collection
        await db.collections.add({
          id: newCollId,
          name: `${coll.name} (Copy)`,
          createdAt: Date.now(),
        });

        // 2. Map old folder IDs to new folder IDs to preserve hierarchy
        const folderIdMap: Record<string, string> = {};
        const collFolders = folders.filter((f) => f.collectionId === collectionId);

        const duplicateFolder = async (folder: Folder, newParentId: string | null) => {
          const newFolderId = `folder-copy-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
          folderIdMap[folder.id] = newFolderId;

          await db.folders.add({
            id: newFolderId,
            collectionId: newCollId,
            parentFolderId: newParentId,
            name: folder.name,
            createdAt: Date.now(),
          });

          // Duplicate subfolders recursively
          const subfolders = collFolders.filter((f) => f.parentFolderId === folder.id);
          for (const sub of subfolders) {
            await duplicateFolder(sub, newFolderId);
          }
        };

        // Duplicate top-level folders
        const rootFolders = collFolders.filter((f) => !f.parentFolderId);
        for (const rf of rootFolders) {
          await duplicateFolder(rf, null);
        }

        // 3. Duplicate all requests
        const collReqs = requests.filter((r) => r.collectionId === collectionId);
        for (const req of collReqs) {
          const newReqId = `req-copy-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
          const newFolderId = req.folderId ? folderIdMap[req.folderId] : null;

          await db.requests.add({
            ...req,
            id: newReqId,
            collectionId: newCollId,
            folderId: newFolderId,
            name: req.name,
            pinned: false,
            favorite: false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
        }
      });

      setExpandedPaths((prev) => ({ ...prev, [newCollId]: true }));
    } catch (err) {
      console.error("Failed to duplicate collection:", err);
    }
  };


  const handleDeleteRequest = async (id: string) => {
    setConfirmState({
      isOpen: true,
      title: "Delete Request",
      message: "Are you sure you want to delete this request?",
      isDestructive: true,
      onConfirm: async () => {
        await db.requests.delete(id);
        await db.tabs.delete(id);
        setConfirmState(null);
      }
    });
  };

  const handleDeleteFolder = async (id: string) => {
    setConfirmState({
      isOpen: true,
      title: "Delete Folder",
      message: "Are you sure you want to delete this folder and all its contents recursively?",
      isDestructive: true,
      onConfirm: async () => {
        // Find all nested sub-folders and requests recursively
        const folderIdsToDelete = new Set<string>([id]);
        
        const getNestedFolders = (parentId: string) => {
          folders.forEach((f) => {
            if (f.parentFolderId === parentId) {
              folderIdsToDelete.add(f.id);
              getNestedFolders(f.id);
            }
          });
        };
        getNestedFolders(id);
        
        // Find requests contained in any of these folders
        const reqsToDelete = requests.filter(
          (r) => r.folderId !== null && folderIdsToDelete.has(r.folderId)
        );

        // Run deletion as an atomic transaction
        await db.transaction("rw", [db.folders, db.requests, db.tabs], async () => {
          for (const fId of folderIdsToDelete) {
            await db.folders.delete(fId);
          }
          for (const r of reqsToDelete) {
            await db.requests.delete(r.id);
            await db.tabs.delete(r.id);
          }
        });

        setConfirmState(null);
      }
    });
  };

  const handleDeleteCollection = async (id: string) => {
    setConfirmState({
      isOpen: true,
      title: "Delete Collection",
      message: "Are you sure you want to delete this entire collection, including all folders and requests recursively?",
      isDestructive: true,
      onConfirm: async () => {
        await db.transaction("rw", [db.collections, db.folders, db.requests, db.tabs], async () => {
          await db.collections.delete(id);
          const collFolders = folders.filter((f) => f.collectionId === id);
          for (const f of collFolders) await db.folders.delete(f.id);
          const collReqs = requests.filter((r) => r.collectionId === id);
          for (const r of collReqs) {
            await db.requests.delete(r.id);
            await db.tabs.delete(r.id);
          }
        });
        setConfirmState(null);
      }
    });
  };

  const handleExportCollection = async (coll: Collection) => {
    try {
      const jsonString = await exportPostmanCollection(coll.id);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${coll.name.toLowerCase().replace(/[^a-z0-9]/g, "_")}.postman_collection.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Failed to export collection: ${err.message}`);
    }
  };

  const handleRename = async (id: string, type: "collection" | "folder" | "request") => {
    if (!renameVal.trim()) {
      setRenameId(null);
      return;
    }
    try {
      if (type === "collection") {
        await db.collections.update(id, { name: renameVal });
      } else if (type === "folder") {
        await db.folders.update(id, { name: renameVal });
      } else {
        await db.requests.update(id, { name: renameVal });
      }
    } catch (err) {
      console.error("Failed to rename item:", err);
    }
    setRenameId(null);
    setRenameVal("");
  };

  // One-Click Scanning handler
  const handleScanLocalCollections = async () => {
    if (!window.electronAPI?.scanPostman) return;
    setScanning(true);
    setImportMsg(null);
    setDiscovered([]);
    setHasScanned(false);
    try {
      const results = await window.electronAPI.scanPostman();
      setDiscovered(results);
      // Pre-select all found collections
      const selection: Record<string, boolean> = {};
      results.forEach((col) => {
        selection[col.filePath] = true;
      });
      setSelectedDiscoveredPaths(selection);
      setHasScanned(true);
      if (results.length === 0) {
        setImportMsg({
          type: "error",
          text: "No Postman collections or backups were found in your standard system folders."
        });
      } else {
        setImportMsg({
          type: "success",
          text: `Discovered ${results.length} local Postman collections!`
        });
      }
    } catch (err: any) {
      console.error("Scan error:", err);
      setImportMsg({
        type: "error",
        text: err.message || "An error occurred during directory scanning."
      });
    } finally {
      setScanning(false);
    }
  };

  // Bulk import selected collections
  const handleImportDiscovered = async () => {
    const toImport = discovered.filter((col) => selectedDiscoveredPaths[col.filePath]);
    if (toImport.length === 0) {
      setImportMsg({
        type: "error",
        text: "Please select at least one collection to import."
      });
      return;
    }

    setScanning(true);
    let successCount = 0;
    let totalReqs = 0;
    let totalFolders = 0;
    let lastError = "";

    for (const col of toImport) {
      try {
        const result = await importPostmanCollection(col.content);
        if (result.success) {
          successCount++;
          totalReqs += result.requestsCount || 0;
          totalFolders += result.foldersCount || 0;
        } else {
          lastError = result.error || "Format issue";
        }
      } catch (err: any) {
        lastError = err.message || "Parse error";
      }
    }

    setScanning(false);
    if (successCount > 0) {
      setImportMsg({
        type: "success",
        text: `Successfully imported ${successCount} collection(s)! (${totalReqs} requests, ${totalFolders} folders)`
      });
      setDiscovered([]);
      setHasScanned(false);
      setTimeout(() => {
        setImportOpen(false);
        setImportMsg(null);
      }, 3000);
    } else {
      setImportMsg({
        type: "error",
        text: lastError || "Failed to import the selected collections."
      });
    }
  };

  // Import Collection Logic
  const handleImportCollection = async () => {
    if (!importJson.trim()) return;
    const result = await importPostmanCollection(importJson);
    if (result.success) {
      setImportMsg({
        type: "success",
        text: `Successfully imported "${result.collectionName}"! (${result.requestsCount} requests, ${result.foldersCount} folders)`,
      });
      setImportJson("");
      setTimeout(() => {
        setImportOpen(false);
        setImportMsg(null);
      }, 3000);
    } else {
      setImportMsg({
        type: "error",
        text: result.error || "Failed to parse Postman collection.",
      });
    }
  };

  const processFiles = async (files: File[]) => {
    let successCount = 0;
    let totalReqs = 0;
    let totalFolders = 0;
    let lastError = "";
    let lastCollectionName = "";

    for (const file of files) {
      if (file.name.endsWith(".json") || file.type === "application/json") {
        try {
          const text = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.onerror = (err) => reject(err);
            reader.readAsText(file);
          });

          const result = await importPostmanCollection(text);
          if (result.success) {
            successCount++;
            totalReqs += result.requestsCount || 0;
            totalFolders += result.foldersCount || 0;
            lastCollectionName = result.collectionName || "";
          } else {
            lastError = result.error || "Failed to parse Postman collection.";
          }
        } catch (err: any) {
          lastError = err.message || "Failed to read file.";
        }
      }
    }

    if (successCount > 0) {
      setImportMsg({
        type: "success",
        text: `Successfully imported ${successCount} collection(s)! ${
          successCount === 1 ? `"${lastCollectionName}"` : ""
        } (${totalReqs} requests, ${totalFolders} folders)`,
      });
      setImportJson("");
      setTimeout(() => {
        setImportOpen(false);
        setImportMsg(null);
      }, 3000);
    } else {
      setImportMsg({
        type: "error",
        text: lastError || "No valid JSON Postman collections were imported.",
      });
    }
  };

  // Render recursion for folders and requests
  const renderTreeFolder = (folder: Folder, depth: number) => {
    const isExpanded = !!expandedNodes[folder.id];
    const isEditing = renameId === folder.id;

    // Get immediate children requests
    const childRequests = filteredRequests.filter((r) => r.folderId === folder.id);
    const childSubfolders = filteredFolders.filter((f) => f.parentFolderId === folder.id);

    return (
      <div key={folder.id} className="flex flex-col select-none">
        {/* Folder Header */}
        <div
          onClick={() => toggleNode(folder.id)}
          style={{ paddingLeft: `${depth * 10 + 4}px` }}
          className="group flex items-center justify-between py-1 px-2 rounded-md hover:bg-neutral-900/65 cursor-pointer text-xs transition-all relative text-neutral-400 hover:text-white"
        >
          <div className="flex items-center gap-1.5 truncate max-w-[70%]">
            <span className="text-neutral-500">
              {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </span>
            <span className="text-neutral-400 shrink-0">
              {isExpanded ? (
                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 text-neutral-400 group-hover:text-neutral-200 transition-colors" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1.5 5C1.5 4.17 2.17 3.5 3 3.5H5.5L7 5.5H12.5C13.33 5.5 14 6.17 14 7V12C14 12.55 13.55 13 13 13H3C2.45 13 2 12.55 2 12V5"/>
                  <path d="M1.5 7.5H14.5"/>
                </svg>
              ) : (
                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 text-neutral-500 group-hover:text-neutral-300 transition-colors" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1.5 4.5C1.5 3.67 2.17 3 3 3H5.5L7 5H13C13.55 5 14 5.45 14 6V12C14 12.55 13.55 13 13 13H3C2.45 13 2 12.55 2 12V4.5Z"/>
                </svg>
              )}
            </span>

            {isEditing ? (
              <input
                type="text"
                value={renameVal}
                onChange={(e) => setRenameVal(e.target.value)}
                onBlur={() => handleRename(folder.id, "folder")}
                onKeyDown={(e) => e.key === "Enter" && handleRename(folder.id, "folder")}
                className="bg-neutral-950 border border-neutral-800 text-white rounded px-1 text-[11px] font-sans focus:outline-none"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="truncate font-sans font-medium">{folder.name}</span>
            )}
          </div>

          {/* Quick Actions (only visible on hover) */}
          <div
            className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 menu-trigger-container"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => handleCreateRequest(folder.collectionId, folder.id)}
              className="p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-emerald-400 cursor-pointer"
              title="Add request"
            >
              <Plus className="h-3 w-3" />
            </button>
            <button
              onClick={() => handleCreateFolder(folder.collectionId, folder.id)}
              className="p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-blue-400 cursor-pointer"
              title="Add nested folder"
            >
              <FolderPlus className="h-3 w-3" />
            </button>

            {/* Menu trigger */}
            <div className="relative">
              <button
                onClick={() => {
                  setActiveMenuId(activeMenuId === folder.id ? null : folder.id);
                  setRenameVal(folder.name);
                }}
                className="p-1 hover:bg-neutral-850 rounded text-neutral-400 hover:text-white cursor-pointer"
              >
                <MoreVertical className="h-3 w-3" />
              </button>

              {activeMenuId === folder.id && (
                <div className="absolute right-0 top-6 z-30 w-32 rounded-lg border border-neutral-800 bg-neutral-950 p-1 shadow-xl text-[10px] font-semibold text-neutral-400">
                  <button
                    onClick={() => {
                      setRenameId(folder.id);
                      setActiveMenuId(null);
                    }}
                    className="w-full text-left px-2 py-1.5 hover:bg-neutral-900 rounded flex items-center gap-1.5 hover:text-white"
                  >
                    <Edit3 className="h-3 w-3" /> Rename
                  </button>
                  <button
                    onClick={() => {
                      handleDeleteFolder(folder.id);
                      setActiveMenuId(null);
                    }}
                    className="w-full text-left px-2 py-1.5 hover:bg-neutral-900 rounded text-red-500 hover:bg-red-950/20 flex items-center gap-1.5"
                  >
                    <Trash2 className="h-3 w-3" /> Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Children Render */}
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden"
            >
              {/* Nested folders */}
              {childSubfolders.map((f) => renderTreeFolder(f, depth + 1))}

              {/* Nested requests */}
              {childRequests.map((r) => renderTreeRequest(r, depth + 1))}

              {childSubfolders.length === 0 && childRequests.length === 0 && (
                <span
                  style={{ paddingLeft: `${(depth + 1) * 10 + 20}px` }}
                  className="text-[10px] text-neutral-600 italic py-1 block"
                >
                  Empty folder
                </span>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const renderTreeRequest = (req: RequestItem, depth: number) => {
    const isSelected = activeRequestId === req.id;
    const isEditing = renameId === req.id;

    return (
      <div
        key={req.id}
        onClick={() => onSelectRequest(req.id)}
        style={{ paddingLeft: `${depth * 10 + 12}px` }}
        className={`group flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-neutral-900/40 cursor-pointer text-xs transition-colors relative font-mono ${
          isSelected ? "bg-neutral-900 border-l border-emerald-500 text-white" : "text-neutral-400 hover:text-neutral-200"
        }`}
      >
        <div className="flex items-center gap-2 truncate max-w-[70%]">
          {getMethodBadge(req.method)}

          {isEditing ? (
            <input
              type="text"
              value={renameVal}
              onChange={(e) => setRenameVal(e.target.value)}
              onBlur={() => handleRename(req.id, "request")}
              onKeyDown={(e) => e.key === "Enter" && handleRename(req.id, "request")}
              className="bg-neutral-950 border border-neutral-800 text-white rounded px-1 text-[11px] font-sans focus:outline-none"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="truncate font-sans font-medium text-[11px]">{req.name}</span>
          )}
        </div>

        {/* Hover Quick Actions */}
        <div
          className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 menu-trigger-container"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={async () => {
              await db.requests.update(req.id, { pinned: !req.pinned });
            }}
            className={`p-1 hover:bg-neutral-800 rounded cursor-pointer ${req.pinned ? "text-emerald-400" : "text-neutral-500"}`}
            title={req.pinned ? "Unpin request" : "Pin request"}
          >
            <Pin className="h-3 w-3" />
          </button>
          <button
            onClick={async () => {
              await db.requests.update(req.id, { favorite: !req.favorite });
            }}
            className={`p-1 hover:bg-neutral-800 rounded cursor-pointer ${req.favorite ? "text-amber-400" : "text-neutral-500"}`}
            title={req.favorite ? "Unfavorite request" : "Favorite request"}
          >
            <Star className="h-3 w-3" />
          </button>

          <div className="relative">
            <button
              onClick={() => {
                setActiveMenuId(activeMenuId === req.id ? null : req.id);
                setRenameVal(req.name);
              }}
              className="p-1 hover:bg-neutral-800 rounded text-neutral-500 hover:text-white cursor-pointer"
            >
              <MoreVertical className="h-3 w-3" />
            </button>

            {activeMenuId === req.id && (
              <div className="absolute right-0 top-6 z-30 w-32 rounded-lg border border-neutral-800 bg-neutral-950 p-1 shadow-xl text-[10px] font-semibold text-neutral-400">
                <button
                  onClick={() => {
                    setRenameId(req.id);
                    setActiveMenuId(null);
                  }}
                  className="w-full text-left px-2 py-1.5 hover:bg-neutral-900 rounded flex items-center gap-1.5 hover:text-white"
                >
                  <Edit3 className="h-3 w-3" /> Rename
                </button>
                <button
                  onClick={() => {
                    handleDuplicateRequest(req);
                    setActiveMenuId(null);
                  }}
                  className="w-full text-left px-2 py-1.5 hover:bg-neutral-900 rounded flex items-center gap-1.5 hover:text-white"
                >
                  <Copy className="h-3 w-3" /> Duplicate
                </button>
                <button
                  onClick={() => {
                    handleDeleteRequest(req.id);
                    setActiveMenuId(null);
                  }}
                  className="w-full text-left px-2 py-1.5 hover:bg-neutral-900 rounded text-red-500 hover:bg-red-950/20 flex items-center gap-1.5"
                >
                  <Trash2 className="h-3 w-3" /> Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const [isSidebarDragging, setIsSidebarDragging] = useState(false);

  const handleSidebarDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsSidebarDragging(true);
  };

  const handleSidebarDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsSidebarDragging(false);
  };

  const handleSidebarDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsSidebarDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      setImportOpen(true);
      processFiles(files);
    }
  };

  return (
    <div 
      onDragOver={handleSidebarDragOver}
      onDragLeave={handleSidebarDragLeave}
      onDrop={handleSidebarDrop}
      className="flex flex-col h-full bg-neutral-950 border-r border-neutral-800 text-neutral-200 relative"
    >
      {isSidebarDragging && (
        <div className="absolute inset-0 bg-neutral-950/90 z-50 flex flex-col items-center justify-center border-2 border-dashed border-[#007acc] p-4 text-center pointer-events-none animate-fade-in font-sans">
          <Upload className="h-8 w-8 text-[#007acc] mb-2 animate-bounce" />
          <p className="text-xs font-bold text-white">Drop Collections Here</p>
          <p className="text-[10px] text-neutral-500 mt-1">Import multiple Postman JSON files instantly</p>
        </div>
      )}
      {/* Top Identity bar (frameless draggable, unified dark styling) */}
      <div 
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        className="px-3 border-b border-neutral-800 bg-neutral-950 flex items-center justify-between shrink-0 h-[41px] select-none"
      >
        <div className="flex items-center gap-2" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          {/* CRED-style minimal stacked-lines icon */}
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ color: 'var(--accent-color)' }}>
            <line x1="2" y1="4" x2="14" y2="4"/>
            <line x1="2" y1="8" x2="11" y2="8"/>
            <line x1="2" y1="12" x2="14" y2="12"/>
          </svg>
          <span className="text-[11px] font-black tracking-widest text-neutral-200 uppercase font-sans">RestMan</span>
        </div>
      </div>

      {/* Global Search Bar */}
      <div className="p-2 border-b border-neutral-800 shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-neutral-500" />
          <input
            type="text"
            placeholder="Search API endpoints (Ctrl+Shift+F)"
            value={localSearch}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>
      </div>

      {/* Navigation Tree scroll area */}
      <div className="flex-1 overflow-y-auto p-2 space-y-4 scrollbar-thin">
        {/* Pinned requests section */}
        {pinnedRequests.length > 0 && (
          <div>
            <div className="px-2 py-1 text-[10px] font-bold text-neutral-500 uppercase tracking-widest flex items-center gap-1">
              <Pin className="h-3 w-3 text-emerald-400" />
              <span>Pinned Requests</span>
            </div>
            <div className="space-y-0.5 mt-1">
              {pinnedRequests.map((r) => renderTreeRequest(r, 0))}
            </div>
          </div>
        )}

        {/* Favorite requests section */}
        {favoriteRequests.length > 0 && (
          <div>
            <div className="px-2 py-1 text-[10px] font-bold text-neutral-500 uppercase tracking-widest flex items-center gap-1">
              <Star className="h-3 w-3 text-amber-400" />
              <span>Favorites</span>
            </div>
            <div className="space-y-0.5 mt-1">
              {favoriteRequests.map((r) => renderTreeRequest(r, 0))}
            </div>
          </div>
        )}

        {/* Collections tree section */}
        <div>
          <div className="px-2 py-1 text-[10px] font-bold text-neutral-500 uppercase tracking-widest flex items-center justify-between">
            <span>Collections</span>
            <button
              onClick={handleCreateCollection}
              className="text-neutral-500 hover:text-white p-0.5 cursor-pointer transition-colors"
              title="Create Collection"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="space-y-1 mt-1 font-sans">
            {filteredCollections.length === 0 && (
              <p className="text-[11px] text-neutral-600 italic px-2 py-4 text-center">No collections found.</p>
            )}

            {filteredCollections.map((coll) => {
              const isExpanded = !!expandedNodes[coll.id];
              const isEditing = renameId === coll.id;

              // Filter root items
              const collRootRequests = filteredRequests.filter((r) => r.collectionId === coll.id && r.folderId === null);
              const collRootFolders = filteredFolders.filter((f) => f.collectionId === coll.id && f.parentFolderId === null);

              return (
                <div key={coll.id} className="flex flex-col select-none">
                  {/* Collection Header */}
                  <div
                    onClick={() => toggleNode(coll.id)}
                    className="group flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-neutral-900/65 cursor-pointer text-xs transition-colors text-white font-semibold"
                  >
                    <div className="flex items-center gap-1.5 truncate max-w-[70%]">
                      <span className="text-neutral-400">
                        {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                      </span>
                      <svg viewBox="0 0 14 14" className="h-3 w-3 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ color: 'var(--accent-color)' }}>
                        <line x1="1" y1="3.5" x2="13" y2="3.5"/>
                        <line x1="1" y1="7" x2="9" y2="7"/>
                        <line x1="1" y1="10.5" x2="13" y2="10.5"/>
                      </svg>

                      {isEditing ? (
                        <input
                          type="text"
                          value={renameVal}
                          onChange={(e) => setRenameVal(e.target.value)}
                          onBlur={() => handleRename(coll.id, "collection")}
                          onKeyDown={(e) => e.key === "Enter" && handleRename(coll.id, "collection")}
                          className="bg-neutral-950 border border-neutral-800 text-white rounded px-1 text-[11px] focus:outline-none"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <span className="truncate">{coll.name}</span>
                      )}
                    </div>

                    {/* Collection Hover Quick Actions */}
                    <div
                      className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 menu-trigger-container"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => handleCreateRequest(coll.id, null)}
                        className="p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-emerald-400 cursor-pointer"
                        title="Add Request to Root"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => handleCreateFolder(coll.id, null)}
                        className="p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-blue-400 cursor-pointer"
                        title="Add Folder to Root"
                      >
                        <FolderPlus className="h-3 w-3" />
                      </button>

                      <div className="relative font-sans">
                        <button
                          onClick={() => {
                            setActiveMenuId(activeMenuId === coll.id ? null : coll.id);
                            setRenameVal(coll.name);
                          }}
                          className="p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white cursor-pointer"
                        >
                          <MoreVertical className="h-3 w-3" />
                        </button>

                        {activeMenuId === coll.id && (
                          <div className="absolute right-0 top-6 z-30 w-32 rounded-lg border border-neutral-800 bg-neutral-950 p-1 shadow-xl text-[10px] font-semibold text-neutral-400">
                            <button
                              onClick={() => {
                                setRenameId(coll.id);
                                setActiveMenuId(null);
                              }}
                              className="w-full text-left px-2 py-1.5 hover:bg-neutral-900 rounded flex items-center gap-1.5 hover:text-white"
                            >
                              <Edit3 className="h-3 w-3" /> Rename
                            </button>
                            <button
                              onClick={() => {
                                handleDuplicateCollection(coll.id);
                                setActiveMenuId(null);
                              }}
                              className="w-full text-left px-2 py-1.5 hover:bg-neutral-900 rounded flex items-center gap-1.5 hover:text-white"
                            >
                              <Copy className="h-3 w-3" /> Duplicate
                            </button>
                            <button
                              onClick={() => {
                                handleExportCollection(coll);
                                setActiveMenuId(null);
                              }}
                              className="w-full text-left px-2 py-1.5 hover:bg-neutral-900 rounded flex items-center gap-1.5 hover:text-white"
                            >
                              <FolderDown className="h-3 w-3" /> Export Collection
                            </button>
                            <button
                              onClick={() => {
                                handleDeleteCollection(coll.id);
                                setActiveMenuId(null);
                              }}
                              className="w-full text-left px-2 py-1.5 hover:bg-neutral-900 rounded text-red-500 hover:bg-red-950/20 flex items-center gap-1.5"
                            >
                              <Trash2 className="h-3 w-3" /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Children Render */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="overflow-hidden"
                      >
                        {/* Folders in collection root */}
                        {collRootFolders.map((folder) => renderTreeFolder(folder, 1))}

                        {/* Requests in collection root */}
                        {collRootRequests.map((req) => renderTreeRequest(req, 1))}

                        {collRootFolders.length === 0 && collRootRequests.length === 0 && (
                          <span className="text-[10px] text-neutral-600 italic py-1 px-8 block">
                            Empty workspace
                          </span>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* bottom importer trigger */}
      <div className="p-3 border-t border-neutral-800 bg-neutral-950/40 shrink-0">
        <button
          onClick={() => setImportOpen(!importOpen)}
          className="w-full rounded-lg border border-neutral-800 hover:border-neutral-700 bg-neutral-950 px-3 py-2 text-xs font-semibold text-neutral-400 hover:text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <Upload className="h-3.5 w-3.5 text-indigo-400 animate-bounce" />
          <span>Import Postman Collection</span>
        </button>
      </div>

      {/* Importer Modal Overlay */}
      {importOpen && (
        <div 
          onDragOver={(e) => {
            e.preventDefault();
            setIsDraggingFile(true);
          }}
          onDragLeave={() => setIsDraggingFile(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDraggingFile(false);
            const files = Array.from(e.dataTransfer.files);
            if (files.length > 0) {
              processFiles(files);
            }
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in"
        >
          <div className={`w-full max-w-lg rounded-xl border p-5 shadow-2xl text-neutral-200 flex flex-col gap-4 transition-all duration-150 ${
            isDraggingFile ? "drag-active border-[#007acc] scale-[1.02] bg-[#181818]/95" : "border-neutral-800 bg-neutral-950"
          }`}>
            <div className="flex items-center justify-between border-b border-neutral-900 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Upload className="h-4 w-4 text-indigo-400" />
                Import Postman Collections
              </h3>
              <button
                onClick={() => {
                  setImportOpen(false);
                  setImportMsg(null);
                }}
                className="rounded-lg p-1 hover:bg-neutral-900 text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                <Plus className="h-4 w-4 transform rotate-45" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-neutral-900 mt-1">
              <button
                onClick={() => {
                  setImportTab("auto");
                  setImportMsg(null);
                }}
                className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                  importTab === "auto"
                    ? "border-indigo-500 text-indigo-400"
                    : "border-transparent text-neutral-400 hover:text-neutral-200"
                }`}
              >
                1-Click Browser-Style Sync
              </button>
              <button
                onClick={() => {
                  setImportTab("manual");
                  setImportMsg(null);
                }}
                className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                  importTab === "manual"
                    ? "border-indigo-500 text-indigo-400"
                    : "border-transparent text-neutral-400 hover:text-neutral-200"
                }`}
              >
                Upload / Paste Files
              </button>
            </div>

            {importTab === "auto" ? (
              <div className="flex flex-col gap-3 py-1">
                <p className="text-[11px] text-neutral-400 leading-relaxed font-sans">
                  RestMan will scan your local computer (AppData folder, Downloads, and Documents) to automatically detect active Postman app databases, collections, and backups, sync-ing them in one click.
                </p>

                {window.electronAPI?.isElectron ? (
                  <>
                    {!hasScanned && !scanning && (
                      <button
                        onClick={handleScanLocalCollections}
                        className="w-full py-6 rounded-lg border border-neutral-850 hover:border-neutral-700 bg-neutral-950 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all hover:bg-neutral-900/50"
                      >
                        <FolderDown className="h-6 w-6 text-indigo-400 animate-bounce" />
                        <span className="text-xs font-bold text-neutral-200">Scan My PC for Postman Collections</span>
                        <span className="text-[10px] text-neutral-500">Searches AppData, Downloads, & Documents</span>
                      </button>
                    )}

                    {scanning && (
                      <div className="py-8 text-center flex flex-col items-center justify-center gap-2">
                        <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
                        <span className="text-xs font-semibold text-neutral-300 font-sans">Searching local filesystem...</span>
                      </div>
                    )}

                    {hasScanned && !scanning && discovered.length > 0 && (
                      <div className="flex flex-col gap-3 font-sans">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Detected Collections</span>
                          <button
                            onClick={handleScanLocalCollections}
                            className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                          >
                            <RefreshCw className="h-2.5 w-2.5" />
                            <span>Rescan</span>
                          </button>
                        </div>

                        <div className="max-h-52 overflow-y-auto border border-neutral-900 rounded-lg p-1.5 bg-neutral-950/60 flex flex-col gap-1.5 scrollbar-thin">
                          {discovered.map((col) => (
                            <label
                              key={col.filePath}
                              className="flex items-start gap-2.5 p-2 hover:bg-neutral-900/60 rounded-lg transition-colors cursor-pointer text-xs"
                            >
                              <input
                                type="checkbox"
                                checked={!!selectedDiscoveredPaths[col.filePath]}
                                onChange={(e) => {
                                  setSelectedDiscoveredPaths((prev) => ({
                                    ...prev,
                                    [col.filePath]: e.target.checked
                                  }));
                                }}
                                className="mt-0.5 accent-indigo-500 rounded border-neutral-850 focus:ring-indigo-500 bg-neutral-950"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-neutral-200 truncate">{col.collectionName}</div>
                                <div className="text-[9px] text-neutral-500 truncate mt-0.5 font-mono">{col.filePath}</div>
                                <div className="text-[9px] text-indigo-400/90 font-semibold mt-1 flex gap-2">
                                  <span>{col.requestsCount} requests</span>
                                  <span>•</span>
                                  <span>{col.foldersCount} folders</span>
                                </div>
                              </div>
                            </label>
                          ))}
                        </div>

                        <button
                          onClick={handleImportDiscovered}
                          disabled={scanning || discovered.filter((c) => selectedDiscoveredPaths[c.filePath]).length === 0}
                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>Import Selected Collections</span>
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="border border-indigo-950/50 bg-indigo-950/10 rounded-lg p-5 text-center mt-1 font-sans">
                    <Layers className="h-8 w-8 text-indigo-400 mx-auto mb-2.5 animate-pulse" />
                    <h4 className="text-xs font-bold text-white mb-1.5">Standalone Feature Available</h4>
                    <p className="text-[11px] text-neutral-400 leading-relaxed max-w-sm mx-auto mb-4">
                      This one-click browser-style auto-import requires direct filesystem access. Install the RestMan standalone desktop client to automatically scan your PC and sync Postman.
                    </p>
                    <button
                      onClick={() => window.open("https://github.com/akibkhan/restman", "_blank")}
                      className="px-3.5 py-1.5 rounded-lg border border-indigo-500/30 hover:border-indigo-500/80 bg-indigo-500/10 text-[10px] font-semibold text-indigo-300 hover:text-white transition-all cursor-pointer"
                    >
                      Download Desktop Client
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="font-sans">
                <p className="text-[11px] text-neutral-400 leading-relaxed mb-3">
                  Paste the raw JSON content or **click the box below to upload multiple files (or drag and drop multiple JSON files)**. RestMan will recursively import folders, headers, methods, variables, and API requests instantly.
                </p>
                
                {/* Drag and Drop visual target zone (with hidden input triggering) */}
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-lg p-6 mb-3 text-center cursor-pointer transition-all duration-150 ${
                    isDraggingFile 
                      ? "border-[#007acc] bg-[#007acc]/10 text-white" 
                      : "border-neutral-850 hover:border-neutral-700 text-neutral-500 hover:text-neutral-400"
                  }`}
                >
                  <Upload className="h-5 w-5 mx-auto mb-1.5 text-neutral-600" />
                  <p className="text-xs font-semibold">Click to upload or Drag & Drop Postman files here</p>
                  <p className="text-[10px] text-neutral-600 mt-0.5">Supports uploading multiple v2 & v2.1 JSON files</p>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  multiple
                  accept=".json,application/json"
                  onChange={(e) => {
                    if (e.target.files) {
                      processFiles(Array.from(e.target.files));
                    }
                  }}
                  className="hidden"
                />

                <textarea
                  placeholder='Or paste raw JSON here (e.g., {"info": { "name": "My Workspace", ... }})'
                  value={importJson}
                  onChange={(e) => setImportJson(e.target.value)}
                  className="w-full h-28 bg-neutral-950 border border-neutral-900 rounded-lg p-3 text-xs font-mono text-neutral-300 focus:outline-none focus:border-indigo-500 scrollbar-thin"
                />
              </div>
            )}

            {importMsg && (
              <div
                className={`p-2.5 rounded border text-xs flex items-center gap-2 font-sans ${
                  importMsg.type === "success"
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                    : "bg-red-500/10 border-red-500/20 text-red-400"
                }`}
              >
                {importMsg.type === "success" ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                <span>{importMsg.text}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 border-t border-neutral-900 pt-3 font-sans">
              <button
                onClick={() => {
                  setImportOpen(false);
                  setImportMsg(null);
                  setDiscovered([]);
                  setHasScanned(false);
                }}
                className="px-3.5 py-2 rounded-lg bg-neutral-900 hover:bg-neutral-850 text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              {importTab === "manual" && (
                <button
                  onClick={handleImportCollection}
                  disabled={!importJson.trim()}
                  className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Import Workspace
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Custom Modern Confirm Modal */}
      {confirmState && (
        <ModernConfirmModal
          isOpen={confirmState.isOpen}
          title={confirmState.title}
          message={confirmState.message}
          isDestructive={confirmState.isDestructive}
          onConfirm={confirmState.onConfirm}
          onCancel={() => setConfirmState(null)}
        />
      )}

      {/* Premium custom naming prompt modal replacing window.prompt() */}
      {inputModalState && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in font-sans">
          <div className="w-full max-w-sm rounded-xl border border-neutral-800 bg-neutral-950 p-5 shadow-2xl text-neutral-200 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-neutral-900 pb-2">
              <h3 className="text-sm font-bold text-white">{inputModalState.title}</h3>
              <button
                onClick={() => setInputModalState(null)}
                className="rounded hover:bg-neutral-900 text-neutral-400 p-0.5 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div>
              <input
                type="text"
                id="sidebar-prompt-input"
                placeholder={inputModalState.placeholder}
                defaultValue={inputModalState.defaultValue}
                className="w-full bg-neutral-950 border border-neutral-850 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const val = (e.target as HTMLInputElement).value;
                    if (val.trim()) {
                      inputModalState.onConfirm(val.trim());
                    }
                    setInputModalState(null);
                  }
                }}
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2 mt-1">
              <button
                onClick={() => setInputModalState(null)}
                className="px-3.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-850 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const inputEl = document.getElementById("sidebar-prompt-input") as HTMLInputElement;
                  if (inputEl && inputEl.value.trim()) {
                    inputModalState.onConfirm(inputEl.value.trim());
                  }
                  setInputModalState(null);
                }}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
