import { createHash } from "crypto";
import { posix } from "path";

const URL_PROTOCOL_RE = /^[a-zA-Z][a-zA-Z\d+.-]*:\/\//;
const SAFE_SEGMENT_RE = /[^a-zA-Z0-9._-]/g;

function sanitizeSegment(segment: string): string {
  let decoded = segment;
  try {
    decoded = decodeURIComponent(segment);
  } catch {
    // Keep original segment when decoding fails.
  }

  const normalized = decoded
    .replace(SAFE_SEGMENT_RE, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return normalized || "segment";
}

function normalizeHost(url: URL): string {
  if (url.port) {
    return `${url.hostname.toLowerCase()}--${url.port}`;
  }

  return url.hostname.toLowerCase();
}

export function parseUrlSpec(spec: string): URL {
  const trimmed = spec.trim();
  if (!trimmed) {
    throw new Error("URL cannot be empty");
  }

  const withProtocol = URL_PROTOCOL_RE.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  let url: URL;
  try {
    url = new URL(withProtocol);
  } catch {
    throw new Error(`Invalid URL: ${spec}`);
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`Unsupported URL protocol: ${url.protocol}`);
  }

  url.hash = "";
  return url;
}

export function normalizeUrl(spec: string): string {
  return parseUrlSpec(spec).toString();
}

export function getPageRelativePath(spec: string | URL): string {
  const url = typeof spec === "string" ? parseUrlSpec(spec) : spec;

  const hostPart = sanitizeSegment(normalizeHost(url));
  const rawSegments = url.pathname.split("/").filter(Boolean);
  const segments = rawSegments.map(sanitizeSegment).filter(Boolean);

  const pathnameEndsWithSlash = url.pathname.endsWith("/") || segments.length === 0;

  let directorySegments = segments;
  let filename = "index.md";

  if (!pathnameEndsWithSlash) {
    const lastSegment = segments[segments.length - 1] || "index";
    const parsed = posix.parse(lastSegment);
    const baseName = sanitizeSegment(parsed.name || parsed.base || "index");
    filename = `${baseName}.md`;
    directorySegments = segments.slice(0, -1);
  }

  if (url.search) {
    const queryHash = createHash("sha1").update(url.search).digest("hex").slice(0, 8);
    filename = filename.replace(/\.md$/, `--q-${queryHash}.md`);
  }

  return posix.join("pages", hostPart, ...directorySegments, filename);
}

export function getUrlHost(spec: string): string {
  return parseUrlSpec(spec).hostname.toLowerCase();
}
