import Dexie, { type Table } from "dexie";

export interface Collection {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
}

export interface Folder {
  id: string;
  collectionId: string;
  parentFolderId: string | null; // null means root of collection
  name: string;
  createdAt: number;
}

export interface RequestItem {
  id: string;
  collectionId: string;
  folderId: string | null; // null means root of collection
  name: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS" | "HEAD";
  url: string;
  headers: { id: string; key: string; value: string; enabled: boolean; description?: string }[];
  params: { id: string; key: string; value: string; enabled: boolean; description?: string }[];
  auth: {
    type: "none" | "bearer" | "basic" | "apiKey";
    bearerToken?: string;
    basicUsername?: string;
    basicPassword?: string;
    apiKeyKey?: string;
    apiKeyValue?: string;
    apiKeyAddTo?: "header" | "query";
  };
  body: {
    type: "none" | "json" | "xml" | "raw" | "form-data" | "urlencoded";
    content?: string;
    formParams?: { id: string; key: string; value: string; enabled: boolean; type: "text" | "file" }[];
  };
  pinned?: boolean;
  favorite?: boolean;
  tags?: string[];
  createdAt: number;
  updatedAt: number;
}

export interface Variable {
  id: string; // the variable name, e.g. "baseUrl"
  value: string;
  description?: string;
  enabled: boolean;
}

export interface RequestTab {
  id: string; // request ID or random for temp tabs
  requestId: string | null; // null for unsaved draft request
  name: string;
  method: string;
  url: string;
  active: boolean;
  order: number;
  // Temporary edit states
  editedRequest?: Partial<RequestItem>;
}

export interface RequestHistoryItem {
  id: string;
  requestId?: string;
  name: string;
  method: string;
  url: string;
  status: number;
  statusText: string;
  duration: number;
  size: number;
  headers: { key: string; value: string }[];
  requestHeaders?: { key: string; value: string }[];
  requestBody?: string;
  responseBody: string;
  timestamp: number;
}

export interface UIState {
  key: string;
  value: any;
}

export interface Environment {
  id: string;
  name: string;
  variables: { key: string; value: string; enabled: boolean; description?: string }[];
  createdAt: number;
}

class FlexiAPIDatabase extends Dexie {
  collections!: Table<Collection, string>;
  folders!: Table<Folder, string>;
  requests!: Table<RequestItem, string>;
  variables!: Table<Variable, string>;
  tabs!: Table<RequestTab, string>;
  history!: Table<RequestHistoryItem, string>;
  uiState!: Table<UIState, string>;
  environments!: Table<Environment, string>;

  constructor() {
    super("FlexiAPIDatabase_v2026");
    this.version(1).stores({
      collections: "id, name, createdAt",
      folders: "id, collectionId, parentFolderId, name, createdAt",
      requests: "id, collectionId, folderId, name, method, url, pinned, favorite, createdAt",
      variables: "id, value, enabled",
      tabs: "id, requestId, active, order",
      history: "id, requestId, method, url, status, timestamp",
      uiState: "key",
    });
    // Version 2: Added environments table
    this.version(2).stores({
      collections: "id, name, createdAt",
      folders: "id, collectionId, parentFolderId, name, createdAt",
      requests: "id, collectionId, folderId, name, method, url, pinned, favorite, createdAt",
      variables: "id, value, enabled",
      tabs: "id, requestId, active, order",
      history: "id, requestId, method, url, status, timestamp",
      uiState: "key",
      environments: "id, name, createdAt",
    });
    // Version 3: Added composite index [requestId+timestamp] on history for fast panel query
    this.version(3).stores({
      collections: "id, name, createdAt",
      folders: "id, collectionId, parentFolderId, name, createdAt",
      requests: "id, collectionId, folderId, name, method, url, pinned, favorite, createdAt",
      variables: "id, value, enabled",
      tabs: "id, requestId, active, order",
      history: "id, requestId, method, url, status, timestamp, [requestId+timestamp]",
      uiState: "key",
      environments: "id, name, createdAt",
    });
  }
}

export const db = new FlexiAPIDatabase();

export const MAX_HISTORY_COUNT = 500;

/**
 * Prunes the request history table to ensure it does not grow unbounded.
 */
export async function pruneHistory() {
  try {
    const count = await db.history.count();
    if (count > MAX_HISTORY_COUNT) {
      const surplus = count - MAX_HISTORY_COUNT;
      // Get the oldest surplus items based on timestamp
      const oldestItems = await db.history
        .orderBy("timestamp")
        .limit(surplus)
        .toArray();
      
      if (oldestItems.length > 0) {
        const idsToDelete = oldestItems.map((item) => item.id);
        await db.history.bulkDelete(idsToDelete);
      }
    }
  } catch (err) {
    console.error("Failed to prune history:", err);
  }
}

// Seed data function to prepopulate DB if empty
export async function seedDatabaseIfEmpty() {
  const collectionCount = await db.collections.count();
  if (collectionCount > 0) return;

  // Insert base collection
  const collId1 = "coll-jsonplaceholder";
  const collId2 = "coll-crypto";

  await db.collections.bulkAdd([
    {
      id: collId1,
      name: "JSONPlaceholder Suite",
      description: "Default mock workspace for JSONPlaceholder API testing",
      createdAt: Date.now(),
    },
    {
      id: collId2,
      name: "Crypto Explorer (CoinGecko)",
      description: "Public cryptocurrency price and market data metrics",
      createdAt: Date.now() - 5000,
    }
  ]);

  // Insert folders
  const fUsers = "folder-users";
  const fPosts = "folder-posts";
  const fMarkets = "folder-markets";

  await db.folders.bulkAdd([
    { id: fUsers, collectionId: collId1, parentFolderId: null, name: "Users Management", createdAt: Date.now() },
    { id: fPosts, collectionId: collId1, parentFolderId: null, name: "Posts & Feed", createdAt: Date.now() },
    { id: fMarkets, collectionId: collId2, parentFolderId: null, name: "Market Metrics", createdAt: Date.now() },
  ]);

  // Insert variables
  await db.variables.bulkAdd([
    { id: "baseUrl", value: "https://jsonplaceholder.typicode.com", description: "Default base endpoint for JSONPlaceholder", enabled: true },
    { id: "apiKeyName", value: "x-custom-header", description: "Demonstration API key parameter key", enabled: true },
    { id: "apiKeyValue", value: "flexi-sec-auth-2026-xyz", description: "Demonstration API key secret", enabled: true },
    { id: "cryptoBaseUrl", value: "https://api.coingecko.com/api/v3", description: "CoinGecko API root URL", enabled: true },
  ]);

  // Insert requests
  const requests: RequestItem[] = [
    {
      id: "req-get-users",
      collectionId: collId1,
      folderId: fUsers,
      name: "List Users (Formatted Dates & Complex Data)",
      method: "GET",
      url: "${baseUrl}/users",
      headers: [
        { id: "h1", key: "Accept", value: "application/json", enabled: true },
        { id: "h2", key: "User-Agent", value: "FlexiStudio/2026", enabled: true }
      ],
      params: [],
      auth: { type: "none" },
      body: { type: "none" },
      pinned: true,
      favorite: true,
      tags: ["users", "get"],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: "req-create-post",
      collectionId: collId1,
      folderId: fPosts,
      name: "Create New Post Payload",
      method: "POST",
      url: "${baseUrl}/posts",
      headers: [
        { id: "hp1", key: "Content-Type", value: "application/json", enabled: true }
      ],
      params: [],
      auth: { type: "none" },
      body: {
        type: "json",
        content: JSON.stringify({
          title: "Flexi API Studio in 2026",
          body: "This is a clean, modern, blazingly fast workspace designed with the beauty of Linear and speed of Raycast.",
          userId: 1,
          meta: {
            tags: ["productive", "api-studio"],
            priority: "high",
            published: true,
            created_at: "2026-06-22T15:30:00Z"
          }
        }, null, 2)
      },
      pinned: false,
      favorite: false,
      tags: ["posts", "mutation"],
      createdAt: Date.now() - 100,
      updatedAt: Date.now() - 100,
    },
    {
      id: "req-get-posts-query",
      collectionId: collId1,
      folderId: fPosts,
      name: "Filter Comments by Post ID",
      method: "GET",
      url: "${baseUrl}/comments",
      headers: [],
      params: [
        { id: "p1", key: "postId", value: "1", enabled: true },
        { id: "p2", key: "active", value: "true", enabled: true },
        { id: "p3", key: "category", value: "tech", enabled: true }
      ],
      auth: { type: "none" },
      body: { type: "none" },
      pinned: false,
      favorite: true,
      tags: ["comments", "query"],
      createdAt: Date.now() - 200,
      updatedAt: Date.now() - 200,
    },
    {
      id: "req-crypto-prices",
      collectionId: collId2,
      folderId: fMarkets,
      name: "Fetch Live Crypto Prices",
      method: "GET",
      url: "${cryptoBaseUrl}/simple/price",
      headers: [],
      params: [
        { id: "cp1", key: "ids", value: "bitcoin,ethereum,solana,cardano,dogecoin", enabled: true },
        { id: "cp2", key: "vs_currencies", value: "usd,eur,gbp", enabled: true },
        { id: "cp3", key: "include_24hr_change", value: "true", enabled: true },
        { id: "cp4", key: "include_last_updated_at", value: "true", enabled: true }
      ],
      auth: { type: "none" },
      body: { type: "none" },
      pinned: true,
      createdAt: Date.now() - 300,
      updatedAt: Date.now() - 300,
    },
    {
      id: "req-crypto-markets",
      collectionId: collId2,
      folderId: fMarkets,
      name: "Top 10 Coins Array Details (Table Visualizer)",
      method: "GET",
      url: "${cryptoBaseUrl}/coins/markets",
      headers: [],
      params: [
        { id: "cmp1", key: "vs_currency", value: "usd", enabled: true },
        { id: "cmp2", key: "order", value: "market_cap_desc", enabled: true },
        { id: "cmp3", key: "per_page", value: "10", enabled: true },
        { id: "cmp4", key: "page", value: "1", enabled: true },
        { id: "cmp5", key: "sparkline", value: "false", enabled: true }
      ],
      auth: { type: "none" },
      body: { type: "none" },
      pinned: false,
      createdAt: Date.now() - 400,
      updatedAt: Date.now() - 400,
    }
  ];

  await db.requests.bulkAdd(requests);

  // Add default active tabs
  await db.tabs.bulkAdd([
    {
      id: "req-get-users",
      requestId: "req-get-users",
      name: "List Users (Formatted Dates & Complex Data)",
      method: "GET",
      url: "${baseUrl}/users",
      active: true,
      order: 0,
    },
    {
      id: "req-create-post",
      requestId: "req-create-post",
      name: "Create New Post Payload",
      method: "POST",
      url: "${baseUrl}/posts",
      active: false,
      order: 1,
    }
  ]);

  // Insert mock request histories
  await db.history.bulkAdd([
    {
      id: "hist-seed-1",
      requestId: "req-get-users",
      name: "List Users (Formatted Dates & Complex Data)",
      method: "GET",
      url: "https://jsonplaceholder.typicode.com/users",
      status: 200,
      statusText: "OK",
      duration: 124,
      size: 5621,
      headers: [
        { key: "Content-Type", value: "application/json; charset=utf-8" },
        { key: "Cache-Control", value: "max-age=43200" }
      ],
      requestHeaders: [
        { key: "Accept", value: "application/json" }
      ],
      responseBody: JSON.stringify([
        {
          id: 1,
          name: "Leanne Graham",
          username: "Bret",
          email: "Sincere@april.biz",
          address: {
            street: "Kulas Light",
            suite: "Apt. 556",
            city: "Gwenborough",
            zipcode: "92998-3874",
            geo: { lat: "-37.3159", lng: "81.1496" }
          },
          phone: "1-770-736-8031 x56442",
          website: "hildegard.org",
          company: {
            name: "Romaguera-Crona",
            catchPhrase: "Multi-layered client-server neural-net",
            bs: "harness real-time e-markets"
          },
          last_login: "2026-03-12T08:15:00Z",
          active: true,
          balance: 14500.50
        },
        {
          id: 2,
          name: "Ervin Howell",
          username: "Antonette",
          email: "Shanna@melissa.tv",
          address: {
            street: "Victor Plains",
            suite: "Suite 879",
            city: "Wisokyburgh",
            zipcode: "90566-7771",
            geo: { lat: "-43.9509", lng: "-34.4618" }
          },
          phone: "010-692-6593 x09125",
          website: "anastasia.net",
          company: {
            name: "Deckow-Crist",
            catchPhrase: "Proactive didactic contingency",
            bs: "synergize scalable supply-chains"
          },
          last_login: "2026-05-18T14:24:00Z",
          active: false,
          balance: 890.00
        },
        {
          id: 3,
          name: "Clementine Bauch",
          username: "Samantha",
          email: "Nathan@yesenia.net",
          address: {
            street: "Douglas Extension",
            suite: "Suite 847",
            city: "McKenziehaven",
            zipcode: "59590-4157",
            geo: { lat: "-68.6102", lng: "-47.0653" }
          },
          phone: "1-463-123-4447",
          website: "ramiro.info",
          company: {
            name: "Romaguera-Jacobson",
            catchPhrase: "Face to face bifurcated interface",
            bs: "e-enable strategic applications"
          },
          last_login: "2026-06-01T21:40:00Z",
          active: true,
          balance: 2450.75
        }
      ], null, 2),
      timestamp: Date.now() - 60000,
    }
  ]);

  // Set default panel sizes
  await db.uiState.bulkAdd([
    { key: "sidebarWidth", value: 280 },
    { key: "requestPaneWidth", value: 500 },
    { key: "theme", value: "light" },
  ]);
}
