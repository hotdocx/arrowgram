export function getBasePath(basePath?: string): string {
  const raw = (basePath ?? "/").trim();
  if (!raw || raw === "/") return "";
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

export function getBaseUrl(basePath?: string): string {
  const normalized = getBasePath(basePath);
  const pathname = normalized ? `${normalized}/` : "/";
  return new URL(pathname, window.location.origin).toString();
}

export function getPrintPreviewUrl(basePath?: string): string {
  return new URL("print-preview", getBaseUrl(basePath)).toString();
}
