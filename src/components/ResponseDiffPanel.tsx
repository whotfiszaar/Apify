import { useState, useMemo, useEffect } from "react";
import { db, type RequestHistoryItem } from "../db/db";
import { diffJsonObjects, type DiffItem } from "../utils/responseInspector";
import { ArrowLeftRight, AlertCircle, AlertTriangle } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import CustomSelect from "./CustomSelect";

interface ResponseDiffPanelProps {
  currentResponse: any;
  currentRequestName: string;
}

export default function ResponseDiffPanel({ currentResponse, currentRequestName }: ResponseDiffPanelProps) {
  const history = (useLiveQuery(() => db.history.orderBy("timestamp").reverse().toArray()) as RequestHistoryItem[]) || [];

  const [selectedHistId, setSelectedHistId] = useState<string>("");
  const [customBText, setCustomBText] = useState<string>("");
  const [customBError, setCustomBError] = useState<string | null>(null);
  const [diffMode, setDiffMode] = useState<"history" | "custom">("history");
  const [filterMode, setFilterMode] = useState<"all" | "changes">("all");

  // Validate custom JSON on text changes
  useEffect(() => {
    if (diffMode === "custom" && customBText.trim()) {
      try {
        JSON.parse(customBText);
        setCustomBError(null);
      } catch (err: any) {
        setCustomBError(err.message || "Invalid JSON syntax");
      }
    } else {
      setCustomBError(null);
    }
  }, [customBText, diffMode]);

  // Memoize options for CustomSelect dropdown
  const historyOptions = useMemo(() => {
    const opts = [
      { value: "", label: "-- Choose a historical run log --" }
    ];
    history
      .filter((h) => h.responseBody)
      .forEach((h) => {
        const dateStr = new Date(h.timestamp).toLocaleTimeString();
        opts.push({
          value: h.id,
          label: `[${h.method}] ${dateStr} - ${h.url.substring(0, 35)} (${h.status} ${h.statusText})`,
        });
      });
    return opts;
  }, [history]);

  // Determine Source B object based on mode
  const sourceB = useMemo(() => {
    if (diffMode === "history") {
      const histItem = history.find((h) => h.id === selectedHistId);
      if (!histItem) return null;
      try {
        return JSON.parse(histItem.responseBody);
      } catch {
        return null;
      }
    } else {
      if (!customBText.trim() || customBError) return null;
      try {
        return JSON.parse(customBText);
      } catch {
        return null;
      }
    }
  }, [diffMode, selectedHistId, customBText, customBError, history]);

  // Compute the diff (Source B is old value, Current Response is new value)
  const diffItems = useMemo<DiffItem[]>(() => {
    if (!currentResponse || !sourceB) return [];
    return diffJsonObjects(sourceB, currentResponse);
  }, [currentResponse, sourceB]);

  // Filter items
  const filteredDiffs = useMemo(() => {
    if (filterMode === "changes") {
      return diffItems.filter((item) => item.type !== "unchanged");
    }
    return diffItems;
  }, [diffItems, filterMode]);

  const counts = useMemo(() => {
    const added = diffItems.filter((i) => i.type === "added").length;
    const removed = diffItems.filter((i) => i.type === "removed").length;
    const modified = diffItems.filter((i) => i.type === "modified").length;
    return { added, removed, modified };
  }, [diffItems]);

  return (
    <div className="flex flex-col gap-4 border border-neutral-900 bg-neutral-950 p-5 rounded-xl text-neutral-200 font-sans">
      {/* Selector Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-neutral-900 pb-4">
        {/* Source A (Fixed to current response) */}
        <div>
          <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider block mb-1">
            Source A (Current Response)
          </span>
          <div className="p-2.5 rounded bg-neutral-900 border border-neutral-850 font-mono text-xs text-white flex items-center justify-between">
            <span className="truncate max-w-[200px] font-sans font-semibold" title={currentRequestName}>
              {currentRequestName || "Untitled Request"}
            </span>
            <span className="text-[9px] bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.2 rounded font-sans font-semibold shrink-0">
              Active Payload
            </span>
          </div>
        </div>

        {/* Source B Selector */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider block">
              Source B (Compare Target)
            </span>
            <div className="flex bg-neutral-900 border border-neutral-850 p-0.5 rounded text-[9px] font-semibold">
              <button
                onClick={() => setDiffMode("history")}
                className={`px-2 py-0.5 rounded transition-all cursor-pointer bg-transparent border-none ${
                  diffMode === "history" ? "bg-neutral-800 text-white shadow font-bold" : "text-neutral-500 hover:text-neutral-300"
                }`}
              >
                History Logs
              </button>
              <button
                onClick={() => setDiffMode("custom")}
                className={`px-2 py-0.5 rounded transition-all cursor-pointer bg-transparent border-none ${
                  diffMode === "custom" ? "bg-neutral-800 text-white shadow font-bold" : "text-neutral-500 hover:text-neutral-300"
                }`}
              >
                Pasted JSON
              </button>
            </div>
          </div>

          {diffMode === "history" ? (
            <CustomSelect
              value={selectedHistId}
              onChange={(val) => setSelectedHistId(val)}
              options={historyOptions}
              className="w-full font-mono text-[11px]"
            />
          ) : (
            <div className="flex flex-col gap-1">
              <textarea
                placeholder='Paste JSON here... e.g. {"status": "success", "id": 1}'
                value={customBText}
                onChange={(e) => setCustomBText(e.target.value)}
                className={`w-full bg-neutral-900 border ${
                  customBError ? "border-rose-500/40 focus:border-rose-500" : "border-neutral-850 focus:border-emerald-500"
                } rounded p-2 text-xs text-neutral-200 font-mono focus:outline-none h-[100px] scrollbar-thin resize-y`}
              />
              {customBError && (
                <span className="text-[10px] text-rose-400 flex items-center gap-1 mt-0.5 font-sans font-semibold">
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                  <span>{customBError}</span>
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Diff Render */}
      {!currentResponse ? (
        <div className="flex flex-col items-center justify-center p-8 text-center h-[200px]">
          <AlertCircle className="h-5 w-5 text-neutral-600 mb-2" />
          <h4 className="text-xs font-semibold text-neutral-400">No Current Response</h4>
          <p className="text-[11px] text-neutral-500 max-w-xs mt-1">
            Send a request first to capture a response, then compare it against past history runs or custom inputs.
          </p>
        </div>
      ) : !sourceB ? (
        <div className="flex flex-col items-center justify-center p-8 text-center h-[200px] border border-dashed border-neutral-900 rounded-lg">
          <ArrowLeftRight className="h-6 w-6 text-neutral-700 mb-2 animate-pulse" />
          <h4 className="text-xs font-semibold text-neutral-400">Select Compare Target Above</h4>
          <p className="text-[11px] text-neutral-500 max-w-sm mt-1 leading-relaxed">
            Choose an execution entry from your local request history or paste valid JSON data into Source B to trigger the comparison matrix.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 animate-fade-in">
          {/* Legend and Filter Controls */}
          <div className="flex flex-wrap justify-between items-center gap-3">
            <div className="flex flex-wrap items-center gap-2.5 text-[10px] font-mono">
              <span className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 px-2 py-0.5 rounded">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                Added ({counts.added})
              </span>
              <span className="flex items-center gap-1.5 bg-red-500/10 text-red-400 border border-red-500/15 px-2 py-0.5 rounded">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span>
                Removed ({counts.removed})
              </span>
              <span className="flex items-center gap-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/15 px-2 py-0.5 rounded">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                Modified ({counts.modified})
              </span>
            </div>

            <div className="flex bg-neutral-900 border border-neutral-850 p-0.5 rounded text-[10px] font-medium shrink-0">
              <button
                onClick={() => setFilterMode("all")}
                className={`px-3 py-1 rounded transition-all cursor-pointer bg-transparent border-none ${
                  filterMode === "all" ? "bg-neutral-800 text-white font-bold" : "text-neutral-500 hover:text-neutral-300"
                }`}
              >
                Show All Fields
              </button>
              <button
                onClick={() => setFilterMode("changes")}
                className={`px-3 py-1 rounded transition-all cursor-pointer bg-transparent border-none ${
                  filterMode === "changes" ? "bg-neutral-800 text-white font-bold" : "text-neutral-500 hover:text-neutral-300"
                }`}
              >
                Changes Only
              </button>
            </div>
          </div>

          {/* Diff Grid Table */}
          <div className="border border-neutral-900 rounded-lg overflow-hidden bg-neutral-950/60 max-h-[350px] overflow-y-auto scrollbar-thin">
            <table className="w-full border-collapse text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-neutral-900 bg-neutral-900/30 text-neutral-400 text-[10px] font-sans font-semibold uppercase tracking-wider sticky top-0 backdrop-blur-md">
                  <th className="py-2.5 px-3 w-[40%]">JSON Path</th>
                  <th className="py-2.5 px-3 w-[30%]">Source B (Compare Target)</th>
                  <th className="py-2.5 px-3 w-[30%]">Source A (Current Response)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-900/50">
                {filteredDiffs.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-neutral-600 text-xs italic font-sans">
                      {filterMode === "changes" ? "No changes detected between payloads!" : "Payloads are completely identical."}
                    </td>
                  </tr>
                ) : (
                  filteredDiffs.map((diff, idx) => {
                    let rowBg = "hover:bg-neutral-900/20";
                    let pathColor = "text-neutral-300";

                    if (diff.type === "added") {
                      rowBg = "bg-emerald-500/5 hover:bg-emerald-500/10";
                      pathColor = "text-emerald-400 font-bold";
                    } else if (diff.type === "removed") {
                      rowBg = "bg-red-500/5 hover:bg-red-500/10";
                      pathColor = "text-red-400 line-through decoration-neutral-500";
                    } else if (diff.type === "modified") {
                      rowBg = "bg-amber-500/5 hover:bg-amber-500/10";
                      pathColor = "text-amber-400 font-bold";
                    }

                    return (
                      <tr key={idx} className={`${rowBg} transition-colors text-[11px]`}>
                        <td className={`py-2 px-3 break-all font-semibold ${pathColor}`}>
                          {diff.key}
                        </td>
                        <td className="py-2 px-3 text-neutral-500 truncate max-w-[200px]" title={String(diff.oldValue)}>
                          {diff.type === "added" ? (
                            <span className="text-neutral-700 italic font-sans">none</span>
                          ) : (
                            String(diff.oldValue)
                          )}
                        </td>
                        <td className="py-2 px-3 text-neutral-200 truncate max-w-[200px]" title={String(diff.newValue)}>
                          {diff.type === "removed" ? (
                            <span className="text-neutral-700 italic font-sans">none</span>
                          ) : (
                            <span className={diff.type === "added" ? "text-emerald-400 font-bold" : diff.type === "modified" ? "text-amber-400 font-bold" : "text-neutral-200"}>
                              {String(diff.newValue)}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
