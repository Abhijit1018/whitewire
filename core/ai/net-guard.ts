import "server-only";

/** Cloud-metadata + link-local hosts that must never be fetched server-side. */
export function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "metadata.google.internal") return true;
  if (h.startsWith("169.254.")) return true; // IPv4 link-local incl. 169.254.169.254 (AWS/GCP metadata)
  if (h.includes(":")) {
    // IPv6 literal: block link-local (fe80::/10) and unique-local (fc00::/7)
    if (h.startsWith("fe80:") || h.startsWith("fc") || h.startsWith("fd")) return true;
  }
  return false;
}

/** Throws if baseUrl is malformed, not http(s), or points at a blocked host. */
export function assertAllowedBaseUrl(baseUrl: string): void {
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    throw new Error("baseUrl must be a valid URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:")
    throw new Error("baseUrl must use http or https");
  if (isBlockedHost(url.hostname)) throw new Error("baseUrl host is not allowed");
}
