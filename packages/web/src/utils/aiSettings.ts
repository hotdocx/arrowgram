const TOKEN_STORAGE_KEY = "hotdocx_bearer_token";

export type AiProvider = "google" | "openrouter";

export type AiModelOption = {
  id: string;
  name: string;
  provider: AiProvider;
  planMin: "free" | "basic" | "pro";
};

export type AiUsageToday = {
  used: number;
  limit: number;
  resetAt: string;
};

export type AiSettingsResponse = {
  defaultModelId: string | null;
  availableModels: AiModelOption[];
  usageToday: AiUsageToday;
  overLimit: boolean;
};

function getApiBaseUrl(): string {
  return (
    (import.meta as any).env?.VITE_API_BASE_URL ||
    (import.meta as any).env?.VITE_BETTER_AUTH_URL ||
    ""
  );
}

function getBearerToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(TOKEN_STORAGE_KEY) ?? "";
}

async function parseJsonSafe(res: Response): Promise<any> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function getErrorMessage(json: any, fallback: string): string {
  if (json && typeof json.error === "string" && json.error.trim()) {
    return json.error;
  }
  return fallback;
}

async function authedJson(path: string, init?: RequestInit): Promise<any> {
  const base = getApiBaseUrl().replace(/\/+$/, "");
  if (!base) throw new Error("SaaS API base URL is not configured.");

  const headers = new Headers(init?.headers);
  const token = getBearerToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${base}${path}`, { ...init, headers });
  const json = await parseJsonSafe(res);
  if (!res.ok) {
    throw new Error(getErrorMessage(json, `Request failed (${res.status})`));
  }
  return json;
}

export function isSaasAiConfigured(): boolean {
  return getApiBaseUrl().trim().length > 0;
}

export async function fetchAiSettings(): Promise<AiSettingsResponse> {
  return (await authedJson("/api/my/ai/settings", { method: "GET" })) as AiSettingsResponse;
}

export async function saveDefaultAiModel(defaultModelId: string): Promise<AiSettingsResponse> {
  return (await authedJson("/api/my/ai/settings", {
    method: "PUT",
    body: JSON.stringify({ defaultModelId }),
  })) as AiSettingsResponse;
}

