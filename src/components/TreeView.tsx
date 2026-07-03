import { useState, useMemo, useEffect } from "react";
import { ChevronRight, ChevronDown, Search, Copy, Check, Bookmark, BookmarkCheck } from "lucide-react";

interface TreeViewProps {
  data: any;
}

interface PathInspectorState {
  path: string;
  type: string;
  value: string;
  length: number;
}

export default function TreeView({ data }: TreeViewProps) {
  const [search, setSearch] = useState("");
  const [expandedPaths, setExpandedPaths] = useState<Record<string, boolean>>({ "": true }); // Root expanded by default
  const [bookmarks, setBookmarks] = useState<Record<string, boolean>>({});
  const [selectedNode, setSelectedNode] = useState<PathInspectorState | null>(null);
  const [copiedPath, setCopiedPath] = useState(false);

  // Copy helper
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPath(true);
    setTimeout(() => setCopiedPath(false), 2000);
  };

  // Toggle path expansion
  const togglePath = (path: string) => {
    setExpandedPaths((prev) => ({ ...prev, [path]: !prev[path] }));
  };

  const toggleBookmark = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setBookmarks((prev) => ({ ...prev, [path]: !prev[path] }));
  };

  // Auto-expand paths matching the search term
  useEffect(() => {
    if (!search.trim() || !data) return;
    const term = search.toLowerCase();
    const newExpanded: Record<string, boolean> = { "": true };

    function scanAndExpand(obj: any, currentPath: string): boolean {
      if (obj && typeof obj === "object") {
        let childMatches = false;
        if (Array.isArray(obj)) {
          obj.forEach((child, idx) => {
            const childPath = currentPath ? `${currentPath}[${idx}]` : `[${idx}]`;
            const subMatch = scanAndExpand(child, childPath);
            if (subMatch) childMatches = true;
          });
        } else {
          Object.keys(obj).forEach((key) => {
            const childPath = currentPath ? `${currentPath}.${key}` : key;
            const matchesKey = key.toLowerCase().includes(term);
            const subMatch = scanAndExpand(obj[key], childPath);
            if (subMatch || matchesKey) childMatches = true;
          });
        }
        if (childMatches) {
          newExpanded[currentPath] = true;
        }
        return childMatches;
      } else {
        return String(obj).toLowerCase().includes(term);
      }
    }

    scanAndExpand(data, "");
    setExpandedPaths((prev) => ({ ...prev, ...newExpanded }));
  }, [search, data]);

  // Expand all paths
  const handleExpandAll = () => {
    const paths: Record<string, boolean> = {};
    function collectPaths(obj: any, currentPath: string) {
      if (obj && typeof obj === "object") {
        paths[currentPath] = true;
        if (Array.isArray(obj)) {
          obj.forEach((_, idx) => collectPaths(obj[idx], currentPath ? `${currentPath}[${idx}]` : `[${idx}]`));
        } else {
          Object.keys(obj).forEach((key) => collectPaths(obj[key], currentPath ? `${currentPath}.${key}` : key));
        }
      }
    }
    collectPaths(data, "");
    setExpandedPaths(paths);
  };

  // Collapse all paths
  const handleCollapseAll = () => {
    setExpandedPaths({ "": true }); // Only root
  };

  // Select node details
  const handleNodeClick = (path: string, val: any, type: string, length: number) => {
    let displayVal = "";
    if (val === null) displayVal = "null";
    else if (typeof val === "object") displayVal = Array.isArray(val) ? `Array [${val.length}]` : "Object { ... }";
    else displayVal = String(val);

    setSelectedNode({
      path: path || "root",
      type,
      value: displayVal,
      length,
    });
  };

  // Component to render individual node
  const renderNode = (nodeData: any, currentPath: string, nodeName: string, depth: number) => {
    const isObject = nodeData !== null && typeof nodeData === "object";
    const isArr = Array.isArray(nodeData);
    const nodeType = nodeData === null ? "null" : typeof nodeData;

    let len = 0;
    if (isObject) {
      len = isArr ? nodeData.length : Object.keys(nodeData).length;
    } else {
      len = String(nodeData).length;
    }

    const isExpanded = !!expandedPaths[currentPath];
    const isBookmarked = !!bookmarks[currentPath];

    // Determine highlighting based on search filter
    const matchesSearch =
      search.trim() !== "" &&
      (nodeName.toLowerCase().includes(search.toLowerCase()) ||
        (!isObject && String(nodeData).toLowerCase().includes(search.toLowerCase())) ||
        currentPath.toLowerCase().includes(search.toLowerCase()));

    const textStyle = matchesSearch ? "bg-amber-500/25 border-b border-amber-500/40 text-white font-bold" : "";

    if (!isObject) {
      // Primitive Leaf Node
      let valStr = String(nodeData);
      let valColor = "text-neutral-300";

      if (nodeData === null) {
        valStr = "null";
        valColor = "text-neutral-500 italic";
      } else if (nodeType === "boolean") {
        valStr = nodeData ? "true" : "false";
        valColor = "text-amber-500";
      } else if (nodeType === "number") {
        valColor = "text-indigo-400";
      } else if (nodeType === "string") {
        valStr = `"${nodeData}"`;
        valColor = "text-emerald-400 truncate max-w-[200px] inline-block align-middle";
      }

      return (
        <div
          key={currentPath}
          onClick={() => handleNodeClick(currentPath, nodeData, nodeType, len)}
          style={{ paddingLeft: `${depth * 16}px` }}
          className="group flex items-center py-1.5 hover:bg-neutral-900/40 rounded transition-colors text-xs font-mono cursor-pointer"
        >
          {/* Alignment spacer */}
          <div className="w-4 h-4 shrink-0"></div>

          {/* Bookmark and Label */}
          <button
            onClick={(e) => toggleBookmark(currentPath, e)}
            className="text-neutral-600 hover:text-amber-500 opacity-0 group-hover:opacity-100 p-0.5 mr-1 transition-opacity shrink-0 cursor-pointer bg-transparent border-none"
            title="Bookmark key"
          >
            {isBookmarked ? (
              <BookmarkCheck className="h-3 w-3 text-amber-500 opacity-100" />
            ) : (
              <Bookmark className="h-3 w-3" />
            )}
          </button>

          <span className={`text-neutral-400 mr-2 shrink-0 ${textStyle}`}>{nodeName}:</span>

          {/* Value */}
          <span className={`${valColor} ${textStyle}`}>{valStr}</span>

          {/* Bookmark Indicator if always active */}
          {isBookmarked && !matchesSearch && (
            <BookmarkCheck className="h-3 w-3 text-amber-500 ml-2 shrink-0" />
          )}
        </div>
      );
    }

    // Branch Node (Object or Array)
    const bracketOpen = isArr ? "[" : "{";
    const bracketClose = isArr ? "]" : "}";
    const badgeText = isArr ? `${len} items` : `${len} keys`;

    return (
      <div key={currentPath} className="flex flex-col">
        <div
          onClick={() => {
            togglePath(currentPath);
            handleNodeClick(currentPath, nodeData, isArr ? "array" : "object", len);
          }}
          style={{ paddingLeft: `${depth * 16}px` }}
          className="group flex items-center py-1.5 hover:bg-neutral-900/40 rounded transition-colors text-xs font-mono cursor-pointer"
        >
          {/* Expand Arrow */}
          <span className="text-neutral-500 mr-0.5 shrink-0">
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </span>

          {/* Bookmark button */}
          <button
            onClick={(e) => toggleBookmark(currentPath, e)}
            className="text-neutral-600 hover:text-amber-500 opacity-0 group-hover:opacity-100 p-0.5 mr-1 transition-opacity shrink-0 cursor-pointer bg-transparent border-none"
            title="Bookmark node"
          >
            {isBookmarked ? (
              <BookmarkCheck className="h-3 w-3 text-amber-500 opacity-100" />
            ) : (
              <Bookmark className="h-3 w-3" />
            )}
          </button>

          <span className={`text-neutral-200 mr-1 shrink-0 ${textStyle}`}>
            {nodeName || "root"}
          </span>

          <span className="text-neutral-500 shrink-0">
            {bracketOpen}
            <span className="bg-neutral-900 border border-neutral-800 text-neutral-400 text-[10px] px-1.5 py-0.2 rounded-full mx-1 font-sans">
              {badgeText}
            </span>
            {bracketClose}
          </span>

          {isBookmarked && (
            <BookmarkCheck className="h-3 w-3 text-amber-500 ml-2 shrink-0" />
          )}
        </div>

        {/* Child rendering recursively */}
        {isExpanded && (
          <div className="flex flex-col">
            {isArr
              ? (nodeData as any[]).map((child, idx) =>
                  renderNode(
                    child,
                    currentPath ? `${currentPath}[${idx}]` : `[${idx}]`,
                    String(idx),
                    depth + 1
                  )
                )
              : Object.keys(nodeData).map((key) =>
                  renderNode(
                    nodeData[key],
                    currentPath ? `${currentPath}.${key}` : key,
                    key,
                    depth + 1
                  )
                )}
          </div>
        )}
      </div>
    );
  };

  const bookmarkedItemsList = useMemo(() => {
    return Object.keys(bookmarks).filter((b) => bookmarks[b]);
  }, [bookmarks]);

  return (
    <div className="flex flex-col gap-3 h-full font-sans">
      {/* Search and Action Header */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-neutral-500" />
          <input
            type="text"
            placeholder="Search keys, values or paths..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-900 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        <div className="flex gap-1.5 text-[10px] font-sans">
          <button
            onClick={handleExpandAll}
            className="px-2.5 py-1.5 bg-neutral-900 border border-neutral-850 hover:bg-neutral-800 rounded text-neutral-300 hover:text-white cursor-pointer transition-colors"
          >
            Expand All
          </button>
          <button
            onClick={handleCollapseAll}
            className="px-2.5 py-1.5 bg-neutral-900 border border-neutral-850 hover:bg-neutral-800 rounded text-neutral-300 hover:text-white cursor-pointer transition-colors"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Bookmarks bar if active */}
      {bookmarkedItemsList.length > 0 && (
        <div className="p-2 border border-neutral-900 rounded-lg bg-neutral-950/20 text-[10px] text-neutral-400 font-sans">
          <span className="font-semibold text-amber-500 block mb-1">Bookmarked Paths:</span>
          <div className="flex flex-wrap gap-1.5">
            {bookmarkedItemsList.map((path) => (
              <span
                key={path}
                onClick={() => {
                  setSearch(path);
                  togglePath(path);
                }}
                className="bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white rounded px-2 py-0.5 cursor-pointer flex items-center gap-1 font-mono"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                {path}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Main Tree */}
      <div className="flex-1 overflow-y-auto border border-neutral-900 bg-neutral-950/20 rounded-xl p-3 scrollbar-thin min-h-[220px]">
        {data ? (
          renderNode(data, "", "", 0)
        ) : (
          <p className="text-neutral-600 text-xs italic p-4 text-center">No JSON payload to explore.</p>
        )}
      </div>

      {/* JSON Path Inspector Footer */}
      {selectedNode && (
        <div className="p-3 border border-neutral-900 rounded-lg bg-neutral-950/60 text-xs flex flex-col gap-1.5 animate-slide-up">
          <div className="flex items-center justify-between font-sans">
            <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
              JSON Path Inspector
            </span>
            <button
              onClick={() => handleCopy(selectedNode.path)}
              className="flex items-center gap-1 text-[10px] bg-neutral-900 hover:bg-neutral-850 text-neutral-300 hover:text-white px-2 py-0.5 rounded cursor-pointer transition-all border border-neutral-855"
            >
              {copiedPath ? (
                <>
                  <Check className="h-3 w-3 text-emerald-400 font-bold" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  <span>Copy Path</span>
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-4 gap-2 font-mono text-[11px] mt-1 bg-neutral-950 p-2 rounded border border-neutral-900">
            <div className="col-span-2">
              <span className="text-neutral-500 block text-[9px] uppercase font-sans font-semibold">Path</span>
              <span className="text-amber-500 font-bold break-all select-all">{selectedNode.path}</span>
            </div>
            <div>
              <span className="text-neutral-500 block text-[9px] uppercase font-sans font-semibold">Type</span>
              <span className="text-indigo-400 capitalize font-sans">{selectedNode.type}</span>
            </div>
            <div>
              <span className="text-neutral-500 block text-[9px] uppercase font-sans font-semibold">
                {selectedNode.type === "object" ? "Keys" : selectedNode.type === "array" ? "Length" : "Chars"}
              </span>
              <span className="text-emerald-400 font-bold">{selectedNode.length}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
