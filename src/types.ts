export interface FetchResult {
  url: string;
  resolvedUrl?: string;
  path: string;
  success: boolean;
  error?: string;
  status?: number;
  contentType?: string;
  markdownTokens?: number;
  contentSignal?: string;
  source?: "cloudflare-markdown" | "html-fallback";
}

export interface PageEntry {
  url: string;
  resolvedUrl?: string;
  path: string;
  fetchedAt: string;
  status: number;
  contentType: string;
  markdownTokens?: number;
  contentSignal?: string;
  source?: "cloudflare-markdown" | "html-fallback";
}

export interface SourcesIndex {
  pages?: PageEntry[];
  updatedAt: string;
}
