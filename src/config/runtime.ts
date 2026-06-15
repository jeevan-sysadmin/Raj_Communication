const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const normalizeBasePath = (value: string) => {
  const trimmed = String(value || "").trim();
  if (!trimmed || trimmed === "/") return "/";

  const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withLeadingSlash.replace(/\/+$/, "") || "/";
};

export const APP_BASE_PATH = normalizeBasePath(
  String(import.meta.env.VITE_APP_BASE_PATH ?? "/raj").trim(),
);

export const buildAppPath = (path: string) => {
  const normalizedPath = `/${String(path || "").replace(/^\/+/, "")}`;
  if (APP_BASE_PATH === "/") return normalizedPath;
  return `${APP_BASE_PATH}${normalizedPath}`;
};

export const resolveAppRedirect = (targetPath: string) => {
  const trimmed = String(targetPath || "").trim();
  if (!trimmed) return buildAppPath("/login");
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith(APP_BASE_PATH)) return trimmed;
  return buildAppPath(trimmed);
};

const getBrowserOrigin = () => {
  if (typeof window !== "undefined" && window.location?.origin) {
    return trimTrailingSlash(window.location.origin);
  }
  return "http://localhost";
};

const buildProductionApiBase = (suffix: "/api" | "/api_sync") => {
  const origin = getBrowserOrigin();
  const basePath = APP_BASE_PATH === "/" ? "" : APP_BASE_PATH;
  return `${origin}${basePath}${suffix}`;
};

export const API_BASE_URL = trimTrailingSlash(
  import.meta.env.DEV ? "/api" : buildProductionApiBase("/api"),
);

export const API_SYNC_BASE_URL = trimTrailingSlash(
  import.meta.env.DEV ? "/api_sync" : buildProductionApiBase("/api_sync"),
);

export const buildApiUrl = (path: string) =>
  `${API_BASE_URL}/${String(path).replace(/^\/+/, "")}`;

export const buildApiSyncUrl = (path: string) =>
  `${API_SYNC_BASE_URL}/${String(path).replace(/^\/+/, "")}`;
