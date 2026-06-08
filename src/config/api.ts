const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const envApiBaseUrl = String(import.meta.env.VITE_API_BASE_URL ?? "").trim();
const envApiSyncBaseUrl = String(import.meta.env.VITE_API_SYNC_BASE_URL ?? "").trim();

export const API_BASE_URL = trimTrailingSlash(
  envApiBaseUrl || "http://cloud.anyrdp.in:3001/raj_communication/api",
);

export const API_SYNC_BASE_URL = trimTrailingSlash(
  envApiSyncBaseUrl || API_BASE_URL.replace(/\/api$/i, "/api_sync"),
);

export const buildApiUrl = (path: string) =>
  `${API_BASE_URL}/${String(path).replace(/^\/+/, "")}`;

export const buildApiSyncUrl = (path: string) =>
  `${API_SYNC_BASE_URL}/${String(path).replace(/^\/+/, "")}`;
