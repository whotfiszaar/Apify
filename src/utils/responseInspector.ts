/**
 * Flattens nested JSON objects into a single-depth key-value mapping.
 * Helpful for TanStack Table columns and nested object flattening.
 * Circular reference protection included.
 */
export function flattenObject(obj: any, prefix = "", seen = new WeakSet()): Record<string, any> {
  const result: Record<string, any> = {};

  if (!obj || typeof obj !== "object") {
    return result;
  }

  if (seen.has(obj)) {
    return { [prefix || "circular"]: "[Circular]" };
  }
  seen.add(obj);

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const propName = prefix ? `${prefix}.${key}` : key;
      const val = obj[key];

      if (val !== null && typeof val === "object" && !Array.isArray(val)) {
        Object.assign(result, flattenObject(val, propName, seen));
      } else {
        result[propName] = val;
      }
    }
  }

  return result;
}

/**
 * Checks if a string is a valid URL
 */
export function isValidUrl(str: string): boolean {
  if (typeof str !== "string") return false;
  try {
    const url = new URL(str);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Checks if a string is an image URL or image data URI
 */
export function isImageUrl(str: string): boolean {
  if (typeof str !== "string") return false;
  if (str.startsWith("data:image/")) return true;
  return /\.(jpeg|jpg|gif|png|webp|svg|bmp)$/i.test(str) || str.includes("images.unsplash.com");
}

/**
 * Formats values beautifully according to their types
 */
export function formatSmartData(value: any, keyName = ""): {
  formatted: string;
  type: "date" | "boolean" | "currency" | "status" | "url" | "image" | "number" | "text" | "null";
  raw: any;
} {
  if (value === null || value === undefined) {
    return { formatted: "null", type: "null", raw: value };
  }

  // Boolean detection
  if (typeof value === "boolean") {
    return {
      formatted: value ? "✓ True" : "✗ False",
      type: "boolean",
      raw: value,
    };
  }

  // Number / Currency detection
  if (typeof value === "number") {
    const keyLower = keyName.toLowerCase();
    if (
      keyLower.includes("price") ||
      keyLower.includes("amount") ||
      keyLower.includes("balance") ||
      keyLower.includes("cost") ||
      keyLower.includes("revenue") ||
      keyLower.includes("usd") ||
      keyLower.includes("eur")
    ) {
      // Default currency formatting
      const formatted = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(value);
      return { formatted, type: "currency", raw: value };
    }
    return { formatted: value.toLocaleString(), type: "number", raw: value };
  }

  // String analyses
  if (typeof value === "string") {
    // Date detection - ISO 8601 pattern
    const dateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})?)?$/;
    if (dateRegex.test(value) && !isNaN(Date.parse(value))) {
      try {
        const dateObj = new Date(value);
        if (!isNaN(dateObj.getTime())) {
          const options: Intl.DateTimeFormatOptions = {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            timeZoneName: "short",
          };
          const formatted = dateObj.toLocaleDateString("en-US", options);
          return { formatted, type: "date", raw: value };
        }
      } catch {
        // Continue if parse fails
      }
    }

    // Status badge detection
    const statusLower = value.toLowerCase().trim();
    const isStatus = [
      "active",
      "inactive",
      "pending",
      "success",
      "failed",
      "completed",
      "cancelled",
      "approved",
      "rejected",
      "true",
      "false",
    ].includes(statusLower);
    if (isStatus || keyName.toLowerCase() === "status") {
      return { formatted: value.toUpperCase(), type: "status", raw: value };
    }

    // Image URL
    if (isImageUrl(value)) {
      return { formatted: value, type: "image", raw: value };
    }

    // Standard URL
    if (isValidUrl(value)) {
      return { formatted: value, type: "url", raw: value };
    }
  }

  return { formatted: String(value), type: "text", raw: value };
}

/**
 * Calculates response nesting depth with circular reference protection and max depth
 */
export function getJsonDepth(obj: any, seen = new WeakSet(), depth = 0): number {
  if (obj === null || typeof obj !== "object" || depth > 100) {
    return 0;
  }
  if (seen.has(obj)) {
    return 0;
  }
  seen.add(obj);

  let maxDepth = 0;
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      maxDepth = Math.max(maxDepth, getJsonDepth(obj[key], seen, depth + 1));
    }
  }
  return 1 + maxDepth;
}

/**
 * Generates an automated local summary of a JSON response
 */
export function generateLocalBusinessSummary(data: any): string {
  try {
    if (!data) return "Empty response.";

    // If it is an array
    if (Array.isArray(data)) {
      if (data.length === 0) {
        return "Response is an empty list of records.";
      }
      const recordCount = data.length;
      const keys = Object.keys(flattenObject(data[0] || {}));
      
      // Let's analyze statuses
      const statuses: Record<string, number> = {};
      let numSum = 0;
      let numCount = 0;
      let numericKey = "";

      data.forEach((item) => {
        if (!item || typeof item !== "object") return;
        
        // Check for any common status fields
        const statusVal = item.status || item.state || item.active;
        if (statusVal !== undefined) {
          const sStr = String(statusVal);
          statuses[sStr] = (statuses[sStr] || 0) + 1;
        }

        // Search for first numeric value to average
        for (const k in item) {
          if (typeof item[k] === "number" && !k.toLowerCase().includes("id")) {
            numSum += item[k];
            numCount++;
            numericKey = k;
            break; // just average one
          }
        }
      });

      let statusSummary = "";
      const statusKeys = Object.keys(statuses);
      if (statusKeys.length > 0) {
        statusSummary = " Distribution of states: " + statusKeys.map(k => `${k} (${statuses[k]} items)`).join(", ") + ".";
      }

      let numericSummary = "";
      if (numCount > 0 && numericKey) {
        const avg = (numSum / numCount).toFixed(2); // Fix: divide by numCount, not data.length
        numericSummary = ` Average value for '${numericKey}' is ${avg}.`;
      }

      return `Response contains ${recordCount} items. Structured with ${keys.length} data fields.${statusSummary}${numericSummary}`;
    }

    // If it is an object
    if (typeof data === "object") {
      const flat = flattenObject(data);
      const keys = Object.keys(flat);
      const values = Object.values(flat);
      const nullCount = values.filter((v) => v === null || v === undefined).length;

      // Find any nested array inside
      let nestedArrayKey = "";
      let nestedArrayLen = 0;
      for (const k in data) {
        if (Array.isArray(data[k])) {
          nestedArrayKey = k;
          nestedArrayLen = data[k].length;
          break;
        }
      }

      const nestedMsg = nestedArrayKey 
        ? ` It contains an array '${nestedArrayKey}' with ${nestedArrayLen} items.` 
        : "";

      return `Single object response containing ${keys.length} flat fields.${nestedMsg} Missing/null values: ${nullCount}. Complexity depth: ${getJsonDepth(data)}.`;
    }

    return "Primitive data type returned: " + typeof data;
  } catch (err) {
    return "Successfully parsed JSON structure.";
  }
}

/**
 * High-performance JSON key/field data profiler
 */
export interface FieldProfile {
  fieldName: string;
  type: string;
  nullPercentage: number;
  uniqueCount: number;
  duplicatePercentage: number;
  mostCommonValue?: string;
}

export function profileResponseData(data: any): FieldProfile[] {
  const profiles: FieldProfile[] = [];
  try {
    const list = Array.isArray(data) ? data : [data];
    if (list.length === 0 || !list[0]) return [];

    // Collect all unique flat keys
    const allFlatKeys = new Set<string>();
    const rowFlatData: Record<string, any>[] = [];

    list.slice(0, 1000).forEach((item) => {
      const flat = flattenObject(item);
      rowFlatData.push(flat);
      Object.keys(flat).forEach((k) => allFlatKeys.add(k));
    });

    const totalRows = rowFlatData.length;

    allFlatKeys.forEach((key) => {
      let nulls = 0;
      const valuesMap = new Map<any, number>();

      rowFlatData.forEach((row) => {
        const val = row[key];
        if (val === null || val === undefined || val === "") {
          nulls++;
        } else {
          valuesMap.set(val, (valuesMap.get(val) || 0) + 1);
        }
      });

      const uniqueCount = valuesMap.size;
      const nullPercentage = Math.round((nulls / totalRows) * 100);

      let mostCommonValue = "N/A";
      let maxCount = 0;
      valuesMap.forEach((count, val) => {
        if (count > maxCount) {
          maxCount = count;
          mostCommonValue = String(val);
        }
      });

      // Fix: duplicate percentage formula
      const activeRows = totalRows - nulls;
      const duplicatePercentage = activeRows > 0 
        ? Math.round(((activeRows - uniqueCount) / activeRows) * 100) 
        : 0;

      // Infer type
      let inferredType = "string";
      for (let i = 0; i < rowFlatData.length; i++) {
        const val = rowFlatData[i][key];
        if (val !== null && val !== undefined) {
          inferredType = typeof val;
          break;
        }
      }

      profiles.push({
        fieldName: key,
        type: inferredType,
        nullPercentage,
        uniqueCount,
        duplicatePercentage: Math.max(0, duplicatePercentage),
        mostCommonValue: mostCommonValue.length > 40 ? mostCommonValue.substring(0, 40) + "..." : mostCommonValue,
      });
    });
  } catch (e) {
    console.error("Data profile error", e);
  }
  return profiles;
}

/**
 * Scans arrays to look for potential charting configurations.
 */
export interface ChartConfigOption {
  label: string;
  xAxisKey: string;
  yAxisKey: string;
  type: "bar" | "line" | "pie";
  availableYKeys: string[];
  availableXKeys: string[];
}

export function extractChartOptions(data: any): ChartConfigOption | null {
  try {
    const list = Array.isArray(data) ? data : (data && typeof data === "object" ? Object.values(data).find(Array.isArray) : null);
    if (!list || list.length === 0) return null;

    const sample = list[0];
    if (!sample || typeof sample !== "object") return null;

    const flatSample = flattenObject(sample);
    const keys = Object.keys(flatSample);

    const xKeys: string[] = []; // Strings, names, dates, labels
    const yKeys: string[] = []; // Numbers

    keys.forEach((k) => {
      const val = flatSample[k];
      const nameLower = k.toLowerCase();
      // Skip IDs
      // Fix: ID field filtering to avoid ending with 'id' like valid/paid/android
      if (nameLower === "id" || nameLower.endsWith(".id") || nameLower.endsWith("_id")) {
        return;
      }
      if (typeof val === "number") {
        yKeys.push(k);
      } else if (typeof val === "string" || typeof val === "boolean") {
        xKeys.push(k);
      }
    });

    if (yKeys.length === 0) return null;

    // Default choices
    const xAxisKey = xKeys.find(k => k.toLowerCase().includes("name") || k.toLowerCase().includes("title") || k.toLowerCase().includes("label") || k.toLowerCase().includes("symbol") || k.toLowerCase().includes("code")) || xKeys[0] || "index";
    const yAxisKey = yKeys[0];

    return {
      label: `Chart of ${yAxisKey} by ${xAxisKey}`,
      xAxisKey,
      yAxisKey,
      type: "bar",
      availableXKeys: xKeys.length > 0 ? xKeys : ["index"],
      availableYKeys: yKeys,
    };
  } catch {
    return null;
  }
}

/**
 * Fast, side-by-side JSON structural and value comparison.
 */
export interface DiffItem {
  key: string;
  type: "added" | "removed" | "modified" | "unchanged";
  oldValue?: any;
  newValue?: any;
}

export function diffJsonObjects(oldObj: any, newObj: any): DiffItem[] {
  const diffs: DiffItem[] = [];

  try {
    const oldFlat = flattenObject(oldObj);
    const newFlat = flattenObject(newObj);

    const allKeys = new Set([...Object.keys(oldFlat), ...Object.keys(newFlat)]);

    allKeys.forEach((key) => {
      const oldVal = oldFlat[key];
      const newVal = newFlat[key];

      if (oldVal !== undefined && newVal === undefined) {
        diffs.push({ key, type: "removed", oldValue: oldVal });
      } else if (oldVal === undefined && newVal !== undefined) {
        diffs.push({ key, type: "added", newValue: newVal });
      } else {
        const isOldObj = oldVal !== null && typeof oldVal === "object";
        const isNewObj = newVal !== null && typeof newVal === "object";
        const isDiff = isOldObj || isNewObj 
          ? JSON.stringify(oldVal) !== JSON.stringify(newVal)
          : oldVal !== newVal;

        if (isDiff) {
          diffs.push({ key, type: "modified", oldValue: oldVal, newValue: newVal });
        } else {
          diffs.push({ key, type: "unchanged", oldValue: oldVal, newValue: newVal });
        }
      }
    });
  } catch (err) {
    console.error("Diff computation error", err);
  }

  return diffs.sort((a, b) => a.key.localeCompare(b.key));
}
