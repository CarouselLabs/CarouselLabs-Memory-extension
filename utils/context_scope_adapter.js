// Lightweight context collector adapted for MV3 service worker + content script environments.
// Mirrors the shape of @carousellabs/context-scope domain/route/page/env collectors.

function parseDomainParts(hostname) {
  try {
    const parts = String(hostname || "").split(".").filter(Boolean);
    if (parts.length === 0) return { name: undefined, fqdn: undefined, subdomain: undefined, tld: undefined };
    const tld = parts.length > 1 ? parts[parts.length - 1] : undefined;
    const name = parts.length > 1 ? parts.slice(-2).join(".") : parts[0];
    const subdomain = parts.length > 2 ? parts.slice(0, -2).join(".") : undefined;
    return { name, fqdn: hostname, subdomain, tld };
  } catch {
    return { name: undefined, fqdn: undefined, subdomain: undefined, tld: undefined };
  }
}

export function collectRelativeContext({ url, title }) {
  let route = { path: undefined, query: {} };
  let domain = { name: undefined, fqdn: undefined, subdomain: undefined, tld: undefined };
  try {
    const u = new URL(url || "");
    route.path = u.pathname || "/";
    route.query = Object.fromEntries(new URLSearchParams(u.search || ""));
    domain = parseDomainParts(u.hostname);
  } catch {
    // ignore malformed URL
  }

  let env = { locale: undefined, timezone: undefined, userAgent: undefined };
  try {
    if (typeof navigator !== "undefined") {
      env.locale = navigator.language || (navigator.languages && navigator.languages[0]) || env.locale;
      env.userAgent = navigator.userAgent;
    }
    if (typeof Intl !== "undefined" && typeof Intl.DateTimeFormat === "function") {
      const resolved = Intl.DateTimeFormat().resolvedOptions();
      env.timezone = resolved.timeZone;
    }
  } catch {
    // ignore
  }

  const page = { title: title || undefined };

  return { domain, route, page, env };
}





