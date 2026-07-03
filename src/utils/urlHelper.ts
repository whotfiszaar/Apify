export interface QueryParamItem {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
  description?: string;
}

/**
 * Parses a full URL with query strings and splits it into a clean base URL
 * and list of parsed query parameters (automatically decoded).
 */
export function parseUrlAndParams(fullUrl: string): { baseUrl: string; params: QueryParamItem[] } {
  try {
    // If the URL has template variables like ${baseUrl}/path?id=5, normal URL parser will fail.
    // Let's do a robust split by '?'
    const questionIndex = fullUrl.indexOf("?");
    if (questionIndex === -1) {
      return { baseUrl: fullUrl, params: [] };
    }

    const baseUrl = fullUrl.substring(0, questionIndex);
    const queryString = fullUrl.substring(questionIndex + 1);
    if (!queryString.trim()) {
      return { baseUrl, params: [] };
    }

    // Split query string by '&'
    const pairs = queryString.split("&");
    const params: QueryParamItem[] = [];

    pairs.forEach((pair, index) => {
      if (!pair) return;
      const eqIndex = pair.indexOf("=");
      let key = "";
      let value = "";

      if (eqIndex === -1) {
        key = pair;
      } else {
        key = pair.substring(0, eqIndex);
        value = pair.substring(eqIndex + 1);
      }

      // Automatically decode URL encoded keys and values
      try {
        key = decodeURIComponent(key);
      } catch {
        // fallback
      }
      try {
        value = decodeURIComponent(value);
      } catch {
        // fallback
      }

      params.push({
        id: `param-${index}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        key,
        value,
        enabled: true,
      });
    });

    return { baseUrl, params };
  } catch (err) {
    console.error("Error parsing URL and params:", err);
    return { baseUrl: fullUrl, params: [] };
  }
}

/**
 * Builds a full URL from a base URL and list of parameters, encoding appropriately.
 */
export function buildUrlWithParams(baseUrl: string, params: QueryParamItem[]): string {
  const enabledParams = params.filter((p) => p.enabled && p.key.trim() !== "");
  if (enabledParams.length === 0) {
    return baseUrl;
  }

  const queryString = enabledParams
    .map((p) => {
      const k = encodeURIComponent(p.key);
      const v = encodeURIComponent(p.value);
      return `${k}=${v}`;
    })
    .join("&");

  // Determine if baseUrl already has query params, strip trailing '?' if any
  let cleanBaseUrl = baseUrl;
  if (cleanBaseUrl.endsWith("?")) {
    cleanBaseUrl = cleanBaseUrl.slice(0, -1);
  }
  const separator = cleanBaseUrl.includes("?") ? "&" : "?";
  return `${cleanBaseUrl}${separator}${queryString}`;
}

/**
 * Detects appropriate headers and request structure based on body content.
 */
export function detectSmartRequestType(content: string): {
  contentType?: string;
  suggestedType?: "json" | "xml" | "none" | "raw";
} {
  const trimmed = content.trim();
  if (!trimmed) return { suggestedType: "none" };

  // Check for JSON
  if (
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"))
  ) {
    try {
      JSON.parse(trimmed);
      return { contentType: "application/json", suggestedType: "json" };
    } catch {
      // Malformed JSON, do not suggest JSON content type
      return { contentType: "text/plain", suggestedType: "raw" };
    }
  }

  // Check for XML
  if (
    trimmed.startsWith("<?xml") ||
    /^\s*<[^>?!]+>[\s\S]*<\/[^>]+>\s*$/g.test(trimmed) ||
    (trimmed.startsWith("<") && trimmed.endsWith(">") && trimmed.includes("</"))
  ) {
    return { contentType: "application/xml", suggestedType: "xml" };
  }

  return { contentType: "text/plain", suggestedType: "raw" };
}

/**
 * Replaces variables like ${variableName} with their values
 */
export function resolveVariables(text: string, variables: { id: string; value: string; enabled: boolean }[]): string {
  if (!text) return "";
  let resolved = text;
  const activeVars = variables.filter((v) => v.enabled);

  activeVars.forEach((v) => {
    // Regex escape to avoid special character issues in variable name
    const escName = v.id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Match ${variableName} with optional whitespace inside
    const regex = new RegExp(`\\$\\{\\s*${escName}\\s*\\}`, "g");
    resolved = resolved.replace(regex, v.value);
  });

  return resolved;
}
