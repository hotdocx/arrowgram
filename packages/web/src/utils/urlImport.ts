export type ImportedContentType = "diagram" | "paper";

export type UrlImportSource =
  | { kind: "inline"; param: "spec" | "paper"; payload: string }
  | { kind: "url"; url: string; requested: string }
  | { kind: "localStorage"; key: string; requested: string };

export function normalizeBase64ForDecode(input: string): string {
  // URLSearchParams turns "+" into space. Undo that first.
  let s = input.replace(/ /g, "+").trim();
  // base64url -> base64
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  // restore padding
  const pad = s.length % 4;
  if (pad === 2) s += "==";
  else if (pad === 3) s += "=";
  return s;
}

export function decodeBase64Utf8ToString(input: string): string {
  const normalized = normalizeBase64ForDecode(input);
  if (typeof atob === "function") {
    const decoded = atob(normalized);
    const bytes = new Uint8Array(decoded.length);
    for (let i = 0; i < decoded.length; i++) bytes[i] = decoded.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  // Node/test fallback
  // eslint-disable-next-line no-undef
  const buf = Buffer.from(normalized, "base64");
  return buf.toString("utf8");
}

export function encodeStringToBase64UrlUtf8(input: string): string {
  if (typeof btoa === "function") {
    const bytes = new TextEncoder().encode(input);
    // @ts-ignore
    const charString = String.fromCharCode.apply(null, bytes);
    const base64 = btoa(charString);
    return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  // Node/test fallback
  // eslint-disable-next-line no-undef
  return Buffer.from(input, "utf8").toString("base64url");
}

export function resolveRequestedImport(
  requested: string,
  baseUrl: string
): UrlImportSource | null {
  const trimmed = requested.trim();
  if (!trimmed) return null;

  if (/^ls:/i.test(trimmed)) {
    const key = trimmed.replace(/^ls:/i, "").trim();
    if (!key) return null;
    return { kind: "localStorage", key, requested: trimmed };
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return { kind: "url", url: trimmed, requested: trimmed };
  }

  // Treat "/x.md" as relative to BASE_URL (GitHub Pages subpaths) like packages/paged.
  const relative = trimmed.replace(/^\/+/, "");
  const url = new URL(relative, baseUrl).toString();
  return { kind: "url", url, requested: trimmed };
}

export function detectImportedType(
  text: string,
  forced?: string | null
): ImportedContentType {
  if (forced === "diagram") return "diagram";
  if (forced === "paper") return "paper";

  try {
    const parsed = JSON.parse(text) as unknown;
    if (
      parsed &&
      typeof parsed === "object" &&
      Array.isArray((parsed as any).nodes)
    ) {
      return "diagram";
    }
  } catch {
    // ignore
  }
  return "paper";
}

