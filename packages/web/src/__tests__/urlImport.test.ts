import {
  decodeBase64Utf8ToString,
  encodeStringToBase64UrlUtf8,
  normalizeBase64ForDecode,
  resolveRequestedImport,
  detectImportedType,
} from "../utils/urlImport";

test("base64url encode/decode roundtrip (utf8)", () => {
  const original = "hello ✓ Привет 你好";
  const encoded = encodeStringToBase64UrlUtf8(original);
  const decoded = decodeBase64Utf8ToString(encoded);
  expect(decoded).toBe(original);
});

test("normalizeBase64ForDecode converts spaces back to +", () => {
  // "a+b" in base64 is "YSti" (no +), but we only need to ensure we undo spaces deterministically.
  const normalized = normalizeBase64ForDecode("ab cd");
  expect(normalized).toBe("ab+cd");
});

test("resolveRequestedImport treats leading / as BASE_URL-relative", () => {
  const baseUrl = "https://example.com/subpath/";
  const src = resolveRequestedImport("/index.md", baseUrl);
  expect(src && src.kind).toBe("url");
  if (src && src.kind === "url") {
    expect(src.url).toBe("https://example.com/subpath/index.md");
  }
});

test("resolveRequestedImport supports localStorage refs", () => {
  const baseUrl = "https://example.com/";
  const src = resolveRequestedImport("ls:my_key", baseUrl);
  expect(src).toEqual({ kind: "localStorage", key: "my_key", requested: "ls:my_key" });
});

test("detectImportedType defaults to diagram when JSON has nodes[]", () => {
  const t = detectImportedType(JSON.stringify({ nodes: [] }, null, 2), null);
  expect(t).toBe("diagram");
});

