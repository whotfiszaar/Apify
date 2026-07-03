import { useState, useMemo } from "react";
import { BarChart, LineChart as LineIcon, PieChart as PieIcon, HelpCircle, ArrowUpDown } from "lucide-react";
import { flattenObject, extractChartOptions } from "../utils/responseInspector";
import CustomSelect from "./CustomSelect";

interface ResponseChartsProps {
  responseData: any;
}

export default function ResponseCharts({ responseData }: ResponseChartsProps) {
  const chartOption = useMemo(() => extractChartOptions(responseData), [responseData]);

  // If no array data is available for charts, show a clean helper view
  if (!chartOption) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border border-neutral-900 bg-neutral-950/40 rounded-xl h-[350px]">
        <div className="rounded-full bg-neutral-900 p-3 text-neutral-500 mb-3">
          <HelpCircle className="h-6 w-6" />
        </div>
        <h4 className="text-sm font-semibold text-white">No Chartable Data Detected</h4>
        <p className="text-xs text-neutral-500 mt-1 max-w-sm leading-relaxed">
          Auto charts require the response to contain an array of objects with at least one string key and one numeric key (e.g. price, quantity, size).
        </p>
      </div>
    );
  }

  const [xAxis, setXAxis] = useState(chartOption.xAxisKey);
  const [yAxis, setYAxis] = useState(chartOption.yAxisKey);
  const [chartType, setChartType] = useState<"bar" | "line" | "pie">("bar");
  const [sortByY, setSortByY] = useState<"none" | "asc" | "desc">("none");
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Map axes choices to CustomSelect options format
  const xAxisOptions = useMemo(() => {
    return chartOption.availableXKeys.map((key) => ({ value: key, label: key }));
  }, [chartOption.availableXKeys]);

  const yAxisOptions = useMemo(() => {
    return chartOption.availableYKeys.map((key) => ({ value: key, label: key }));
  }, [chartOption.availableYKeys]);

  // Extract raw flat array to chart
  const rawArray = useMemo(() => {
    if (Array.isArray(responseData)) return responseData;
    if (responseData && typeof responseData === "object") {
      const arr = Object.values(responseData).find(Array.isArray);
      if (arr) return arr;
    }
    return [];
  }, [responseData]);

  // Map and sort data points
  const chartData = useMemo(() => {
    let items = rawArray.map((item: any, idx: number) => {
      const flat = flattenObject(item);
      const xVal = flat[xAxis] !== undefined ? String(flat[xAxis]) : `Row ${idx + 1}`;
      const yVal = typeof flat[yAxis] === "number" ? flat[yAxis] : 0;
      return {
        label: xVal,
        value: yVal,
        rawIndex: idx,
      };
    });

    if (sortByY === "asc") {
      items.sort((a, b) => a.value - b.value);
    } else if (sortByY === "desc") {
      items.sort((a, b) => b.value - a.value);
    }

    // Cap at 15 items to maintain high readability
    return items.slice(0, 15);
  }, [rawArray, xAxis, yAxis, sortByY]);

  const yMax = useMemo(() => {
    const vals = chartData.map((d) => d.value);
    const max = Math.max(...vals, 1);
    return max * 1.1; // 10% breathing room
  }, [chartData]);

  const ySum = useMemo(() => {
    return chartData.reduce((sum, d) => sum + d.value, 0);
  }, [chartData]);

  // Color Palette for sectors and bars
  const colors = [
    "from-emerald-500 to-teal-600",
    "from-blue-500 to-indigo-600",
    "from-violet-500 to-purple-600",
    "from-pink-500 to-rose-600",
    "from-amber-500 to-orange-600",
    "from-cyan-500 to-blue-600",
    "from-emerald-400 to-teal-500",
  ];

  const pieColors = [
    "#10b981", // Emerald
    "#3b82f6", // Blue
    "#8b5cf6", // Violet
    "#ec4899", // Pink
    "#f59e0b", // Amber
    "#06b6d4", // Cyan
    "#6366f1", // Indigo
    "#f43f5e", // Rose
    "#14b8a6", // Teal
    "#a855f7", // Purple
  ];

  return (
    <div className="border border-neutral-900 bg-neutral-950 rounded-xl p-5 shadow-inner">
      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-900 pb-4 mb-5 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          {/* X Axis */}
          <div className="flex items-center gap-1.5">
            <span className="text-neutral-500 font-sans">X-Axis (Label):</span>
            <CustomSelect
              value={xAxis}
              onChange={(val) => setXAxis(val)}
              options={xAxisOptions}
              className="font-mono text-[11px]"
            />
          </div>

          {/* Y Axis */}
          <div className="flex items-center gap-1.5">
            <span className="text-neutral-500 font-sans">Y-Axis (Value):</span>
            <CustomSelect
              value={yAxis}
              onChange={(val) => setYAxis(val)}
              options={yAxisOptions}
              className="font-mono text-[11px]"
            />
          </div>

          {/* Sort */}
          <button
            onClick={() => {
              setSortByY((prev) => (prev === "none" ? "desc" : prev === "desc" ? "asc" : "none"));
            }}
            className="flex items-center gap-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 rounded px-2 py-1 transition-colors cursor-pointer"
          >
            <ArrowUpDown className="h-3.5 w-3.5 text-neutral-400" />
            <span>Sort: {sortByY === "none" ? "Default" : sortByY === "desc" ? "High → Low" : "Low → High"}</span>
          </button>
        </div>

        {/* Chart Type Selector */}
        <div className="flex items-center gap-1 bg-neutral-900 p-0.5 rounded-lg border border-neutral-800">
          <button
            onClick={() => setChartType("bar")}
            className={`flex items-center gap-1 px-3 py-1 rounded-md transition-all cursor-pointer ${
              chartType === "bar"
                ? "bg-emerald-600 text-white font-medium shadow"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <BarChart className="h-3.5 w-3.5" />
            <span>Bar</span>
          </button>
          <button
            onClick={() => setChartType("line")}
            className={`flex items-center gap-1 px-3 py-1 rounded-md transition-all cursor-pointer ${
              chartType === "line"
                ? "bg-emerald-600 text-white font-medium shadow"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <LineIcon className="h-3.5 w-3.5" />
            <span>Line</span>
          </button>
          <button
            onClick={() => setChartType("pie")}
            className={`flex items-center gap-1 px-3 py-1 rounded-md transition-all cursor-pointer ${
              chartType === "pie"
                ? "bg-emerald-600 text-white font-medium shadow"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <PieIcon className="h-3.5 w-3.5" />
            <span>Pie</span>
          </button>
        </div>
      </div>

      {/* Drawing Board */}
      <div className="relative min-h-[250px] w-full flex items-center justify-center">
        {chartData.length === 0 ? (
          <p className="text-neutral-500 italic text-xs">No entries to plot.</p>
        ) : chartType === "bar" ? (
          /* BAR CHART RENDERING */
          <div className="w-full flex flex-col justify-end h-[220px]">
            <div className="flex items-end justify-between h-[180px] px-4 border-b border-neutral-800 gap-2">
              {chartData.map((d, idx) => {
                const pct = (d.value / yMax) * 100;
                const grad = colors[idx % colors.length];
                return (
                  <div
                    key={idx}
                    className="flex-1 flex flex-col items-center justify-end h-full group relative cursor-pointer"
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                  >
                    {/* Value Popover on Hover */}
                    <div
                      className={`absolute -top-7 bg-neutral-900 border border-neutral-800 text-neutral-100 font-mono text-[10px] px-2 py-0.5 rounded shadow-lg pointer-events-none transition-all duration-150 z-20 ${
                        hoveredIdx === idx ? "opacity-100 scale-100" : "opacity-0 scale-95"
                      }`}
                    >
                      {d.value.toLocaleString()}
                    </div>

                    {/* Bar Pillar */}
                    <div
                      style={{ height: `${pct}%` }}
                      className={`w-full max-w-[40px] rounded-t bg-gradient-to-t ${grad} transition-all duration-500 ease-out border border-transparent group-hover:border-white/25 shadow-md`}
                    ></div>
                  </div>
                );
              })}
            </div>

            {/* Labels Axis */}
            <div className="flex items-start justify-between px-4 mt-2 h-8 text-[9px] text-neutral-500 font-mono">
              {chartData.map((d, idx) => (
                <div
                  key={idx}
                  className={`flex-1 text-center truncate max-w-[60px] transition-colors ${
                    hoveredIdx === idx ? "text-emerald-400 font-bold" : ""
                  }`}
                  title={d.label}
                >
                  {d.label}
                </div>
              ))}
            </div>
          </div>
        ) : chartType === "line" ? (
          /* LINE CHART RENDERING */
          <div className="w-full h-[220px] flex flex-col">
            <div className="relative flex-1 px-4 border-b border-neutral-800">
              <svg className="w-full h-full overflow-visible" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="line-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                {/* Generate Line and Area Paths */}
                {(() => {
                  const points = chartData.map((d, idx) => {
                    const xPct = chartData.length > 1 ? (idx / (chartData.length - 1)) * 100 : 50;
                    const yPct = 100 - (d.value / yMax) * 85 - 5; // offset from bottom & top
                    return { xPct, yPct, value: d.value, label: d.label };
                  });

                  // Build SVG path
                  const dPath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.xPct}% ${p.yPct}%`).join(" ");
                  const areaPath = points.length > 0
                    ? `${dPath} L 100% 100% L 0% 100% Z`
                    : "";

                  return (
                    <>
                      {/* Grid Lines */}
                      <line x1="0%" y1="15%" x2="100%" y2="15%" stroke="#1e1e1e" strokeDasharray="3,3" />
                      <line x1="0%" y1="50%" x2="100%" y2="50%" stroke="#1e1e1e" strokeDasharray="3,3" />
                      <line x1="0%" y1="85%" x2="100%" y2="85%" stroke="#1e1e1e" strokeDasharray="3,3" />

                      {/* Filled Area */}
                      {areaPath && <path d={areaPath} fill="url(#line-grad)" className="transition-all duration-500" />}

                      {/* Stroke Line */}
                      {dPath && (
                        <path
                          d={dPath}
                          fill="none"
                          stroke="#10b981"
                          strokeWidth="2.5"
                          className="transition-all duration-500"
                        />
                      )}

                      {/* Interactive Points */}
                      {points.map((p, idx) => (
                        <g
                          key={idx}
                          className="cursor-pointer group"
                          onMouseEnter={() => setHoveredIdx(idx)}
                          onMouseLeave={() => setHoveredIdx(null)}
                        >
                          <circle
                            cx={`${p.xPct}%`}
                            cy={`${p.yPct}%`}
                            r={hoveredIdx === idx ? "7" : "4.5"}
                            fill="#0a0a0a"
                            stroke="#10b981"
                            strokeWidth="2"
                            className="transition-all duration-150"
                          />
                        </g>
                      ))}
                    </>
                  );
                })()}
              </svg>

              {/* Tooltip on Line */}
              {hoveredIdx !== null && chartData[hoveredIdx] && (
                <div
                  className="absolute bg-neutral-900 border border-neutral-800 text-neutral-100 font-mono text-[10px] px-2.5 py-1 rounded shadow-xl z-20 top-2 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-0.5"
                >
                  <span className="text-neutral-400 font-sans">{chartData[hoveredIdx].label}</span>
                  <span className="text-emerald-400 font-bold">{chartData[hoveredIdx].value.toLocaleString()}</span>
                </div>
              )}
            </div>

            {/* Labels Axis */}
            <div className="flex items-start justify-between px-2 mt-2 h-8 text-[9px] text-neutral-500 font-mono">
              {chartData.map((d, idx) => (
                <div
                  key={idx}
                  className={`flex-1 text-center truncate max-w-[60px] transition-colors ${
                    hoveredIdx === idx ? "text-emerald-400 font-bold" : ""
                  }`}
                  title={d.label}
                >
                  {d.label}
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* PIE CHART RENDERING */
          <div className="flex items-center gap-12 py-4">
            <svg className="w-48 h-48 transform -rotate-90 overflow-visible" viewBox="0 0 100 100">
              {(() => {
                let accumulatedPercent = 0;

                return chartData.map((d, idx) => {
                  const percent = d.value / (ySum || 1);
                  const strokeVal = percent * 100;
                  const strokeDasharray = `${strokeVal} ${100 - strokeVal}`;
                  accumulatedPercent += strokeVal;
                  const color = pieColors[idx % pieColors.length];

                  return (
                    <circle
                      key={idx}
                      cx="50"
                      cy="50"
                      r="40"
                      fill="transparent"
                      stroke={color}
                      strokeWidth="12"
                      strokeDasharray={strokeDasharray}
                      strokeDashoffset={100 - (accumulatedPercent - strokeVal)}
                      className="transition-all duration-500 hover:stroke-[14] cursor-pointer"
                      onMouseEnter={() => setHoveredIdx(idx)}
                      onMouseLeave={() => setHoveredIdx(null)}
                    />
                  );
                });
              })()}
              <circle cx="50" cy="50" r="28" fill="#050505" />
            </svg>

            {/* Legends Panel */}
            <div className="flex flex-col gap-1.5 max-h-[190px] overflow-y-auto scrollbar-thin text-xs max-w-[280px]">
              {chartData.map((d, idx) => {
                const pct = ((d.value / (ySum || 1)) * 100).toFixed(1);
                const color = pieColors[idx % pieColors.length];
                const isHovered = hoveredIdx === idx;
                return (
                  <div
                    key={idx}
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    className={`flex items-center gap-2 px-2.5 py-1 rounded transition-colors ${
                      isHovered ? "bg-neutral-900" : ""
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }}></span>
                    <span className={`truncate text-neutral-300 font-mono max-w-[130px] ${isHovered ? "text-white font-medium" : ""}`}>
                      {d.label}
                    </span>
                    <span className="ml-auto font-mono text-[10px] text-neutral-500 font-bold">
                      {pct}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
