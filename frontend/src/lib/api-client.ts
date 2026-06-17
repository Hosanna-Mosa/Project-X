const sanitizeEnvValue = (value?: string) => {
  if (!value) return "";
  return value.trim().replace(/^['"]+|['"]+$/g, "");
};

export const API_BASE_URL =
  sanitizeEnvValue(import.meta.env.VITE_API_BASE_URL) ||
  sanitizeEnvValue(import.meta.env.VITE_API_URL) ||
  "http://localhost:5000/api/v1";

const buildApiUrl = (endpoint: string) => {
  const cleanEndpoint = endpoint.trim();

  if (/^https?:\/\//i.test(cleanEndpoint)) {
    return cleanEndpoint.replace(/^['"]+|['"]+$/g, "");
  }

  const normalizedEndpoint = cleanEndpoint.startsWith("/") ? cleanEndpoint : `/${cleanEndpoint}`;
  return `${API_BASE_URL.replace(/\/$/, "")}${normalizedEndpoint}`;
};

type ApiOptions = RequestInit & {
  skipJsonContentType?: boolean;
};

export async function apiFetch<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { skipJsonContentType, headers, ...requestOptions } = options;
  const token = localStorage.getItem("vendor_token") || localStorage.getItem("admin_token");
  const url = buildApiUrl(endpoint);

  const response = await fetch(url, {
    ...requestOptions,
    headers: {
      ...(!skipJsonContentType ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message || "Request failed");
  }

  return data as T;
};
